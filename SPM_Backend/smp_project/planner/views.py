from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework.decorators import api_view


from .serializers import WBSScopeSerializer
from .services import (
    generate_wbs_from_scope,
    generate_gantt_from_scope,
    generate_full_plan_from_text,
    guarded_project_answer,
    detect_language,
)

from .risk_engine import generate_risks_from_wbs, save_risks,save_wbs,load_wbs
from .risk_ai import generate_ai_risks_from_scope



# دالة ترجمة بسيطة للعربية
def translate_to_ar(text: str) -> str:
    dictionary = {
        "API Delay Risk": "مخاطر تأخر واجهة API",
        "Task depends on external or backend API readiness.": "المهمة تعتمد على جاهزية واجهات API الخارجية أو الخلفية.",
    }
    return dictionary.get(text, text)


# -------------------------------
# توليد WBS
# -------------------------------
class GenerateWBSView(APIView):
    def post(self, request):
        serializer = WBSScopeSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        scope = serializer.validated_data["project_scope"]

        try:
            wbs_data = generate_wbs_from_scope(scope)
        except Exception as e:
            return Response({"detail": f"Error generating WBS: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        project_id = request.data.get("project_id", 1)
        save_wbs(project_id, wbs_data)

        return Response(wbs_data, status=status.HTTP_200_OK)


@api_view(["POST"])
def ask_project_manager(request):
    user_input = request.data.get("question")
    mode = request.data.get("mode", "normal")  

    if not user_input:
        return Response({"error": "Please provide a question"},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        answer = guarded_project_answer(user_input, mode=mode)
    except Exception as e:
        return Response(
            {"error": f"LLM error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response({"answer": answer})

# توليد المخاطر
@api_view(["POST"])
def generate_project_risks(request):

    project_id = request.data.get("project_id")
    wbs_id = request.data.get("wbs_id")

    if not project_id or not wbs_id:
        return Response(
            {"error": "يجب إرسال كل من project_id و wbs_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        wbs = load_wbs(wbs_id)
    except Exception as e:
        return Response({"error": f"Error loading WBS: {str(e)}"}, status=500)

    # استخراج وصف المشروع من WBS
    project_scope = wbs.get("project_scope", "")

    # توليد مخاطر AI
    try:
        ai_risks_data = generate_ai_risks_from_scope(project_scope, wbs_summary=wbs)
        ai_risks = ai_risks_data.get("risks", [])
    except Exception as e:
        return Response({"error": f"Error generating AI risks: {str(e)}"}, status=500)


    # تحديد اللغة
    lang = detect_language(project_scope)

    # Rule-based risks
    rule_based = []
    if wbs:
       rule_based = generate_risks_from_wbs(wbs, lang=lang)

    # ترجمة rule-based إلى العربية إذا الإدخال عربي
    if lang == "ar":
        for r in rule_based:
            if "title" in r:
                r["title"] = translate_to_ar(r["title"])
            if "description" in r:
                r["description"] = translate_to_ar(r["description"])

    # AI-based risks
    try:
        ai_risks_data = generate_ai_risks_from_scope(project_scope, wbs_summary=wbs)
        ai_risks = ai_risks_data.get("risks", [])
    except Exception as e:
        return Response(
            {"error": f"Error generating AI risks: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # دمج المخاطر
    combined = []
    risk_id = 1

    for r in rule_based + ai_risks:
        r["id"] = risk_id
        risk_id += 1
        combined.append(r)

    save_risks(project_id, combined)

    return Response(
        {
            "project_id": project_id,
            "project_scope": project_scope,
            "total_risks": len(combined),
            "risks": combined,
        },
        status=status.HTTP_200_OK,
    )


class GenerateGanttView(APIView):
    """Generate Gantt chart JSON from scope + methodology + resources using OpenRouter."""
    def post(self, request):
        scope = request.data.get("project_scope")
        methodology = request.data.get("methodology")
        resources_text = request.data.get("resources_text") or request.data.get("resources")

        if not scope:
            return Response(
                {"error": "project_scope is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            gantt = generate_gantt_from_scope(
                scope_text=scope,
                methodology=methodology,
                resources_text=resources_text,
            )
        except Exception as e:
            return Response(
                {"detail": f"Error generating Gantt chart: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(gantt, status=status.HTTP_200_OK)

class GenerateFullPlanView(APIView):
    """Single endpoint: from one text generate WBS + Gantt + basic risks."""
    def post(self, request):
        description = request.data.get("project_description") or request.data.get("project_scope")

        if not description:
            return Response(
                {"error": "project_description (or project_scope) is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = generate_full_plan_from_text(description)
        except Exception as e:
            return Response(
                {"detail": f"Error generating full plan: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(plan, status=status.HTTP_200_OK)
