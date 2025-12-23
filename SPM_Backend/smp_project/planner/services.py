import json
import re
import requests
from typing import Any, Dict, List, Optional

from django.conf import settings


# ==============================
#  Low–level OpenRouter client
# ==============================

OPENROUTER_API_URL = getattr(
    settings,
    "OPENROUTER_BASE_URL",
    "https://openrouter.ai/api/v1",
).rstrip("/") + "/chat/completions"

DEFAULT_OPENROUTER_MODEL = getattr(
    settings,
    "OPENROUTER_MODEL",
    "meta-llama/llama-3.1-8b-instruct",
)


def _call_openrouter(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> str:
    """
    Call OpenRouter chat/completions endpoint and return the assistant content.
    Raises an exception if the call fails.
    """
    api_key = getattr(settings, "OPENROUTER_API_KEY", None)
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured in settings.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",  # اختياري
        "X-Title": "SMP Project Planner",         # اختياري
    }

    payload = {
        "model": model or DEFAULT_OPENROUTER_MODEL,
        "messages": messages,
        "temperature": temperature,
    }

    response = requests.post(
        OPENROUTER_API_URL,
        headers=headers,
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise RuntimeError(f"Unexpected OpenRouter response: {data}") from exc


# ==============================
#  Helper utilities
# ==============================


def detect_language(text: str) -> str:
    arabic_chars = set("ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآىة")
    return "ar" if any(ch in arabic_chars for ch in text) else "en"


def build_short_scope_message(text: str) -> str:
    lang = detect_language(text)
    if lang == "ar":
        return "يجب إدخال وصف مشروع برمجي يحتوي على 5 كلمات على الأقل."
    else:
        return "You must provide a software project description of at least 5 words."


def build_not_software_message(text: str) -> str:
    lang = detect_language(text)
    if lang == "ar":
        return (
            "هذا الطلب لا يبدو متعلقاً بمشروع برمجي  "
            "يمكنني المساعدة فقط في تخطيط مشاريع البرمجيات"
        )
    else:
        return (
            "This request does not seem to be related to a software or IT project. "
            "I can only assist with software project planning."
        )


def is_too_short_scope(text: str, min_words: int = 5) -> bool:
    """
    Return True if the text has fewer than min_words non-empty words.
    """
    words = [w for w in text.strip().split() if w]
    return len(words) < min_words


def get_pert_values(task_name: str):
    """
    Very simple heuristic to generate PERT (a, m, b) estimates
    based on the task name. يمكنك تعديل الأرقام كما تريد لاحقًا.
    """
    name = task_name.lower()

    if any(k in name for k in ["setup", "install", "env", "environment"]):
        return 0.5, 1, 2
    if any(k in name for k in ["design", "analysis", "architecture"]):
        return 2, 3, 5
    if any(k in name for k in ["api", "backend", "database", "integration"]):
        return 3, 5, 8
    if any(k in name for k in ["frontend", "ui", "ux"]):
        return 2, 4, 6
    if any(k in name for k in ["testing", "qa", "test"]):
        return 1, 2, 4

    # default
    return 1, 3, 5


def compute_pert(a: float, m: float, b: float) -> float:
    """
    Expected duration using classic PERT formula.
    """
    return (a + 4 * m + b) / 6.0


def _add_pert_estimates_to_wbs(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Traverse WBS JSON and:
    - يعتمد على قيم a, m, b القادمة من المودل.
    - يحسب effort_days باستخدام معادلة PERT.
    - لو a أو m أو b مفقودة → نحط قيمة بسيطة افتراضية (مثلاً 1,2,3) بس كـ fallback.
    """
    phases = data.get("phases", [])
    for phase in phases:
        tasks = phase.get("tasks", [])
        for task in tasks:
            a = task.get("a")
            m = task.get("m")
            b = task.get("b")

            # لو المودل ما عبّاهم لأي سبب، نعطيهم قيم صغيرة افتراضية
            if a is None or m is None or b is None:
                a = a or 1
                m = m or 2
                b = b or 3
                task["a"] = a
                task["m"] = m
                task["b"] = b

            task["effort_days"] = compute_pert(float(a), float(m), float(b))

    return data



# ==============================
#  Prompts
# ==============================

EXPLANATION_MODE_PROMPT = """
You have different explanation modes:
- "normal": short, direct explanation.
- "detailed": long, step-by-step explanation.
- "summary": bullet points only.
- "child":
    * Answer as if you are a 8–10 year old child.
    * Use VERY simple words and very short sentences.
    * Maximum 3–4 sentences.
    * Do NOT write long paragraphs.
    * Do NOT repeat the same idea many times.
    * If the user writes in Arabic, answer in Arabic.
    * If the user writes in English, answer in English.

When you answer, adapt your writing style to the requested mode: {mode}.
""".strip()

CHILD_MODE_PROMPT = """
You must answer as if explaining to a 6–10 year old child.

Rules:
- Use very simple, friendly language.
- Use ONE fun analogy from a child’s world:
  (cake, LEGO, toy car, drawing, animals, school bag…)
- Sentences must be short (max 6–9 words).
- Keep the explanation technically correct but easy.
- Never use technical terms unless simplified.
- Do NOT use lists or bullet points.
- Do NOT use quotes or special characters.
- ALWAYS answer in the same language the child used.
- The output must be JSON:
{"answer": "<text>"}
""".strip()




PROJECT_MANAGER_SYSTEM_PROMPT = """
You are an expert SOFTWARE PROJECT PLANNER.

Your job:
- Understand the user's software project scope.
- Work ONLY on software / IT / web / mobile / data projects.
- Generate or explain:
  - Work Breakdown Structure (WBS)
  - Gantt schedule
  - risks, milestones, rough estimations
- Always keep answers technically realistic.

Very important behavioural rules:
- If the user sends general chit-chat or non-project questions
  (for example: "hi", "how are you", "tell me a joke", personal or random topics)
  you MUST NOT generate WBS / Gantt / risks.
  Instead, answer briefly in the same language:
  something like "I am only for software project planning. Please describe a software project."
- If the user sends a project that is NOT about software (e.g. building a house),
  answer that you only work on software/IT projects.

Language:
- Detect the user language (Arabic or English).
- Answer in the same language.
""".strip()


WBS_PROMPT_TEMPLATE = """
The user will describe a SOFTWARE project scope.
They may also mention the delivery methodology (Agile/Scrum, Kanban, Waterfall, Hybrid).

Your tasks:
1. Infer or confirm the methodology.
2. Build a clear Work Breakdown Structure (WBS) for this project.
3. Organise it into PHASES and TASKS.
4. Each task should be implementation-level (2–5 days of work).

For each task you MUST estimate PERT values:
- "a": optimistic duration in working days (smallest realistic number)
- "m": most likely duration in working days
- "b": pessimistic duration in working days (worst realistic case)
All of them MUST be integers >= 1 and <= 60.
Do NOT leave them null.

Return ONLY a valid JSON object with EXACTLY this structure (no markdown):

{
  "project_name": "short name of the project",
  "methodology": "Agile | Scrum | Kanban | Waterfall | Hybrid",
  "phases": [
    {
      "id": "1",
      "name": "Phase name",
      "description": "short sentence",
      "tasks": [
        {
          "id": "1.1",
          "name": "Task name",
          "description": "what will be done",
          "dependencies": ["1.0"],
          "resource": "role or person if mentioned",
          "a": 3,
          "m": 5,
          "b": 8,
          "effort_days": null
        }
      ]
    }
  ]
}

Project scope:
<<SCOPE>>

If the text is NOT a software project description, return this exact JSON instead:
{
  "error": "NOT_SOFTWARE_PROJECT",
  "message": "I only plan software / IT projects."
}
""".strip()


GANTT_PROMPT_TEMPLATE = """
You will receive:
- A description of a SOFTWARE project scope.
- The preferred methodology (if known).
- Optionally: available resources (roles, people, capacity).

Your tasks:
1. Build a realistic high-level schedule for the project.
2. Use working-day durations (no need to skip weekends).
3. Respect dependencies and methodology (for Agile, use sprints; for Waterfall, use sequential phases).

Return ONLY valid JSON with this exact structure:

{
  "project_name": "short name",
  "methodology": "Agile | Scrum | Kanban | Waterfall | Hybrid",
  "start_date": "YYYY-MM-DD",
  "gantt_tasks": [
    {
      "id": "1.1",
      "wbs_id": "1.1",
      "name": "Task name",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "duration_days": 5,
      "resource": "Backend dev",
      "dependencies": ["1.0"]
    }
  ]
}

Project scope:
<<SCOPE>>

Methodology (may be empty if user did not specify clearly):
<<METHODOLOGY>>

Resources (if provided by the user; may be empty):
<<RESOURCES>>

If this is NOT a software project, return:
{
  "error": "NOT_SOFTWARE_PROJECT",
  "message": "I only plan software / IT projects."
}
""".strip()


FULL_PLAN_PROMPT_TEMPLATE = """
The user will describe a SOFTWARE project with one free text.
From this SINGLE input you must generate:

1) A Work Breakdown Structure (WBS) (WBS_PROMPT_TEMPLATE ).
2) A Gantt chart schedule ( GANTT_PROMPT_TEMPLATE ).
3) A short list of top project risks.

Return ONLY valid JSON with this shape:

{
  "project_name": "...",
  "methodology": "...",
  "wbs": { "project_name": "short name of the project",
  "methodology": "Agile | Scrum | Kanban | Waterfall | Hybrid",
  "phases": [
    {
      "id": "1",
      "name": "Phase name",
      "description": "short sentence",
      "tasks": [
        {
          "id": "1.1",
          "name": "Task name",
          "description": "what will be done",
          "dependencies": ["1.0"],
          "resource": "role or person if mentioned",
          "a": 3,
          "m": 5,
          "b": 8,
          "effort_days": null
        }
      ]
    }
  ]},
  "gantt": { 
  "project_name": "short name",
  "methodology": "Agile | Scrum | Kanban | Waterfall | Hybrid",
  "start_date": "YYYY-MM-DD",
  "gantt_tasks": [
    {
      "id": "1.1",
      "wbs_id": "1.1",
      "name": "Task name",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "duration_days": 5,
      "resource": "Backend dev",
      "dependencies": ["1.0"]
    }
  ] },
  "risks": [
    {
      "id": 1,
      "title": "short risk title",
      "description": "what can go wrong",
      "category": "Technical | Schedule | Cost | Resource | External | Other",
      "trigger": "what event or condition indicates this risk may occur",
      "owner": "role or person responsible for managing this risk",
      "probability": 40,
      "impact": "Low | Medium | High",
      "mitigation": "how to reduce the risk"
    }
  ]
}

IMPORTANT RULES FOR RISKS:
- "probability" MUST be a number from 0 to 100 representing a percentage (for example 10, 35, 80).
- "impact" MUST be one of: "Low", "Medium", "High".
- "category" MUST be a short label that classifies the risk (e.g. Technical, Schedule, Cost, Resource, External, Other).
- "trigger" MUST clearly describe what situation or signal warns that the risk might happen.
- "owner" MUST be the role or person responsible for monitoring and handling this risk.

User project description:
<<SCOPE_AND_RESOURCES>>

If the input is not a software project, you MUST return EXACTLY this JSON and NOTHING ELSE:

{"error":"NOT_SOFTWARE_PROJECT","message":"I only plan software / IT projects."}

""".strip()



# ==============================
#  High level service functions
# ==============================


def _extract_json_block(text: str) -> str:
    """
    Try to extract the first {...} JSON block from the model response.
    Works even if the model adds extra text before/after.
    """
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in model response.")
    return match.group(0)


def build_language_instruction(text: str) -> str:
    lang = detect_language(text)
    if lang == "ar":
        return (
            "The user's language is Arabic. "
            "You MUST write all human-readable text (names, descriptions, explanations, risk titles) "
            "in clear Modern Standard Arabic. "
            "Keep all JSON keys in English exactly as specified."
        )
    else:
        return (
            "The user's language is English. "
            "You MUST write all human-readable text in English. "
            "Keep all JSON keys in English exactly as specified."
        )





def translate_to_english(text: str) -> str:
    """
    Use the same OpenRouter model to translate Arabic text to English.
    If the text is already English, we just return it as-is.
    (حاليّاً غير مستخدمة، لكن ممكن تستعمليها لاحقاً لو حبيتي.)
    """
    if detect_language(text) != "ar":
        return text

    messages = [
        {
            "role": "system",
            "content": (
                "You are a professional translator from Arabic to English. "
                "Translate the user's text to natural English suitable for software project planning. "
                "Return ONLY the translated English text, no explanations."
            ),
        },
        {"role": "user", "content": text},
    ]

    translated = _call_openrouter(messages, temperature=0.0)
    return translated.strip()


def guarded_project_answer(user_input: str, mode: str = "normal") -> str:
    """
    General Q&A endpoint for project planning questions ONLY.
    It uses PROJECT_MANAGER_SYSTEM_PROMPT to refuse small-talk or non-software topics.

    - لو mode = "normal" / "detailed" / "summary" → يستخدم EXPLANATION_MODE_PROMPT.
    - لو mode = "child" → يستخدم CHILD_MODE_PROMPT ليشرح كأنه لطفل صغير.
    """
    # لو الطفل → نستخدم برومبت خاص
    if mode == "child":
        messages = [
            {"role": "system", "content": PROJECT_MANAGER_SYSTEM_PROMPT},
            {"role": "system", "content": CHILD_MODE_PROMPT},
            {"role": "user", "content": user_input},
        ]
        return _call_openrouter(messages, temperature=0.3).strip()

    # باقي الأنماط (normal / detailed / summary)
    mode_prompt = EXPLANATION_MODE_PROMPT.format(mode=mode)

    messages = [
        {"role": "system", "content": PROJECT_MANAGER_SYSTEM_PROMPT},
        {"role": "assistant", "content": mode_prompt},
        {"role": "user", "content": user_input},
    ]

    return _call_openrouter(messages, temperature=0.4).strip()




def generate_wbs_from_scope(scope_text: str) -> Dict[str, Any]:
    """
    Generate WBS JSON from scope using OpenRouter.

    - لو السكوب أقل من 5 كلمات → يرجع خطأ ولا يكلّم الموديل.
    - يدعم عربي / إنكليزي.
    """
    if is_too_short_scope(scope_text):
        return {
            "error": "SCOPE_TOO_SHORT",
            "message": build_short_scope_message(scope_text),
        }

    prompt = WBS_PROMPT_TEMPLATE.replace("<<SCOPE>>", scope_text)

    messages = [
        {"role": "system", "content": PROJECT_MANAGER_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    raw = _call_openrouter(messages, temperature=0.15)
    json_str = _extract_json_block(raw)
    data = json.loads(json_str)

    if data.get("error") == "NOT_SOFTWARE_PROJECT":
        data["message"] = build_not_software_message(scope_text)
        return data

    return _add_pert_estimates_to_wbs(data)


def generate_gantt_from_scope(
    scope_text: str,
    methodology: Optional[str] = None,
    resources_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate Gantt JSON from scope + methodology + resources.

    - لو السكوب أقل من 5 كلمات → يرجع خطأ.
    """
    if is_too_short_scope(scope_text):
        return {
            "error": "SCOPE_TOO_SHORT",
            "message": build_short_scope_message(scope_text),
        }

    prompt = GANTT_PROMPT_TEMPLATE
    prompt = prompt.replace("<<SCOPE>>", scope_text)
    prompt = prompt.replace("<<METHODOLOGY>>", methodology or "")
    prompt = prompt.replace("<<RESOURCES>>", resources_text or "")

    messages = [
        {"role": "system", "content": PROJECT_MANAGER_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    raw = _call_openrouter(messages, temperature=0.2)
    json_str = _extract_json_block(raw)
    data = json.loads(json_str)

    if isinstance(data, dict) and data.get("error") == "NOT_SOFTWARE_PROJECT":
        data["message"] = build_not_software_message(scope_text)
        return data

    return data


def generate_full_plan_from_text(scope_and_resources_text: str) -> Dict[str, Any]:
    """
    Take a single free-form text (scope + methodology + resources) and return
    WBS + Gantt + basic risks in a single JSON.

    - لو النص أقل من 5 كلمات → SCOPE_TOO_SHORT.
    - لو سوالف / طلب غير برمجي → NOT_SOFTWARE_PROJECT.
    - يحاول قراءة JSON بعدة طرق لتجنّب PARSE_ERROR قدر الإمكان.
    """
    # شرط أقل من 5 كلمات
    if is_too_short_scope(scope_and_resources_text):
        return {
            "error": "SCOPE_TOO_SHORT",
            "message": build_short_scope_message(scope_and_resources_text),
        }

    not_software_msg = build_not_software_message(scope_and_resources_text)
    lang_instruction = build_language_instruction(scope_and_resources_text)

    prompt = FULL_PLAN_PROMPT_TEMPLATE.replace(
        "<<SCOPE_AND_RESOURCES>>",
        scope_and_resources_text,
    )

    messages = [
        {"role": "system", "content": PROJECT_MANAGER_SYSTEM_PROMPT},
        {"role": "system", "content": lang_instruction},
        {"role": "user", "content": prompt},
    ]

    raw = _call_openrouter(messages, temperature=0.25)
    lower_raw = raw.lower()

    # حالة رد نصي واضح أنه رفض (مثلاً: I am only for software project planning...)
    if "only for software project planning" in lower_raw or "not a software project" in lower_raw:
        return {
            "error": "NOT_SOFTWARE_PROJECT",
            "message": not_software_msg,
        }

    # نحاول نفك JSON بعدة طرق
    try:
        data = json.loads(raw)
        if isinstance(data, str):
            data = json.loads(data)
    except Exception:
        try:
            json_str = _extract_json_block(raw)
            data = json.loads(json_str)
        except Exception:
            return {
                "error": "PARSE_ERROR",
                "message": "Model did not return valid JSON.",
                "raw_response": raw,
            }

    if isinstance(data, dict) and data.get("error") == "NOT_SOFTWARE_PROJECT":
        data["message"] = not_software_msg
        return data

    if isinstance(data, dict) and isinstance(data.get("wbs"), dict):
        data["wbs"] = _add_pert_estimates_to_wbs(data["wbs"])

        # تعديل شكل probability لتظهر مع علامة %
    if isinstance(data, dict) and isinstance(data.get("risks"), list):
        for risk in data["risks"]:
            prob = risk.get("probability")
            # لو رجع رقم (int أو float) نحوله لنص مع %
            if isinstance(prob, (int, float)):
                risk["probability"] = f"{int(prob)}%"

    return data
