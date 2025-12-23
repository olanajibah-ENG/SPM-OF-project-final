# planner/risk_ai.py

import json
from groq import Groq
from django.conf import settings
from .services import detect_language
from .utils_risk import probability_to_percent, impact_to_label

client = Groq(api_key=settings.GROQ_API_KEY)


RISK_AI_PROMPT_TEMPLATE = """
You are an expert in **software project risk management**.

Detected language: {lang}
language = "Arabic" if lang == "ar" else "English"
LANGUAGE RULE:
- If language is "ar": return all text in Arabic.
- If language is "en": return all text in English.

PROJECT SCOPE:
{project_scope}

{wbs_block}

STRICT RULES:
- Only JSON output
- 5–12 risks
- probability & impact must be integers 1–5

JSON FORMAT EXACTLY:

{{
  "project_scope": "short title or cleaned summary of the project",
  "risks": [
    {{
      "id": 1,
      "title": "",
      "description": "",
      "category": "",
      "probability": 1,
      "impact": 1,
      "owner": "",
      "mitigation": "",
      "trigger": ""
    }}
  ]
}}

Generate risks in {language} only.
"""


# ============================================================
# Helper: تنظيف واستخراج JSON من خروج الـ LLM
# ============================================================
def extract_json(raw: str, start_hint: str | None = None) -> str:
    """
    ينظّف الاستجابة من ```json و ``` ويحاول أن يستخرج أول JSON صحيح.
    لو حددنا start_hint (مثل {"project_scope") يحاول يبدأ منها أولاً.
    """

    # إزالة markdown مثل ```json
    raw = raw.replace("```json", "").replace("```", "").strip()

    # لو حاب نبدأ من مفتاح معيّن مثل {"project_scope"
    start_idx = -1
    if start_hint:
        start_idx = raw.find(start_hint)

    # لو ما لقى الـ hint، نرجع لأول {
    if start_idx == -1:
        start_idx = raw.find("{")

    last_brace = raw.rfind("}")

    if start_idx == -1 or last_brace == -1 or last_brace <= start_idx:
        raise ValueError(f"AI did not return valid JSON structure.\nRAW:\n{raw}")

    json_str = raw[start_idx:last_brace + 1].strip()
    return json_str


# ============================================================
# 1) توليد قائمة المخاطر الكاملة من الـ scope + WBS
# ============================================================
def generate_ai_risks_from_scope(project_scope: str, wbs_summary: dict | None = None) -> dict:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set in .env")

    if len(project_scope.split()) < 5:
        raise ValueError("وصف المشروع قصير جداً، اكتب وصفاً أطول قليلاً")

    lang = detect_language(project_scope)
    language = "Arabic" if lang == "ar" else "English"

    # تجهيز الـ WBS ضمن النص
    if wbs_summary:
        wbs_block = "HIGH LEVEL WBS (for context only):\n" + json.dumps(
            wbs_summary, ensure_ascii=False, indent=2
        )
    else:
        wbs_block = "No WBS provided."

    prompt = RISK_AI_PROMPT_TEMPLATE.format(
        lang=lang,
        project_scope=project_scope,
        wbs_block=wbs_block,
        language=language,
    )

    response = client.chat.completions.create(
       model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()

    try:
        # هنا نستخدم hint عشان نضمن البداية من {"project_scope"
        json_str = extract_json(raw, start_hint='{"project_scope"')
        data = json.loads(json_str)
    except Exception as e:
        # بدل ما نكسر الـ API، نرجع بدون AI risks مع رسالة واضحة في اللوج
        print("ERROR parsing AI risks JSON:", e)
        print("RAW RESPONSE FROM GROQ:\n", raw)
        return {
            "project_scope": project_scope,
            "risks": [],
        }

    # نضمن أن الـ scope هو نفسه النص المدخل من المستخدم
    data["project_scope"] = project_scope
   
    for r in data.get("risks", []):
       prob_score = r.get("probability", 3)
       impact_score = r.get("impact", 3)
       r["probability"] = f"{probability_to_percent(prob_score)}%"
       r["impact"] = impact_to_label(impact_score, lang)


       # نتأكد من وجود قائمة risks
       if "risks" not in data or not isinstance(data["risks"], list):
        data["risks"] = []

    return data


# ============================================================
# 2) توليد خطر واحد بناء على Task + Rule (لـ rule-based engine)
# ============================================================
def generate_single_risk_ai(task_name: str, risk_title: str, lang: str = "en") -> dict:
    prompt = f"""
    You are a software risk analysis expert.

    Task: {task_name}
    Risk name: {risk_title}
    Language: {"Arabic" if lang == "ar" else "English"}

    JSON ONLY:
    {{
        "title": "",
        "description": "",
        "probability_score": 1,
        "impact_score": 1
    }}
    """

    response = client.chat.completions.create(
     model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    raw = response.choices[0].message.content.strip()
    json_str = extract_json(raw) 
    data = json.loads(json_str)

    # تحويل القيم إلى الشكل النهائي
    prob_percent = probability_to_percent(data.get("probability_score", 1))
    impact_label = impact_to_label(data.get("impact_score", 1), lang)

    data["probability"] = f"{prob_percent}%"
    data["impact"] = impact_label

    return data
