import json
import os
from .risk_ai import generate_single_risk_ai

WBS_FOLDER = os.path.join(os.path.dirname(__file__), "wbs_data")

def save_wbs(wbs_id, data):
    if not os.path.exists(WBS_FOLDER):
        os.makedirs(WBS_FOLDER)

    path = os.path.join(WBS_FOLDER, f"wbs_{wbs_id}.json")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_wbs(wbs_id):
    path = os.path.join(WBS_FOLDER, f"wbs_{wbs_id}.json")

    if not os.path.exists(path):
        raise FileNotFoundError(f"WBS file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

DATA_DIR = "data"

# تحويل درجة الاحتمال (1–5) إلى نسبة مئوية
def probability_to_percent(score: int) -> int:
    """
    1 → 20%
    2 → 40%
    3 → 60%
    4 → 80%
    5 → 100%
    """
    return max(0, min(100, score * 20))


def impact_to_label(score: int, lang: str = "en") -> str:
    """
    1–2 → Low / منخفض
    3   → Medium / متوسط
    4–5 → High / عالي
    """
    if score <= 2:
        return "منخفض" if lang == "ar" else "Low"
    elif score == 3:
        return "متوسط" if lang == "ar" else "Medium"
    else:
        return "عالي" if lang == "ar" else "High"


# حساب مستوى الخطر
def compute_exposure(prob, impact):
    return prob * impact


# توليد المخاطر من WBS
def generate_risks_from_wbs(wbs: dict, lang: str = "en"):
    all_tasks = []
    for activity in wbs["activities"]:
        for task in activity["tasks"]:
            all_tasks.append(task)

    from .risk_rules import RISK_RULES

    risks = []
    risk_id = 1

    for task in all_tasks:
        task_name = task["name"].lower()

        for rule in RISK_RULES:
            if rule["keyword"] in task_name:

                # 1) توليد خطر عبر الذكاء الاصطناعي
                ai_risk = generate_single_risk_ai(
                    task_name=task["name"],
                    risk_title=rule["title"],
                    lang=lang
                )

                # 2) قراءة القيم من الذكاء الاصطناعي
                prob_score = ai_risk.get("probability_score", 3)
                impact_score = ai_risk.get("impact_score", 3)

                # 3) تحويل القيم إلى Probability% + Impact Label
                prob_percent = probability_to_percent(prob_score)
                impact_label = impact_to_label(impact_score, lang)

                # 4) حساب التعرض للخطر exposure
                exposure = prob_score * impact_score

                # 5) بناء عنصر الخطر النهائي
                risk_obj = {
                    "id": risk_id,
                    "title": ai_risk.get("title"),
                    "description": ai_risk.get("description"),
                    "category": rule.get("category", "Other"),
                    "probability": f"{prob_percent}%",
                    "impact": impact_label,
                    "owner": rule.get("owner", "Project Manager"),
                    "mitigation": rule.get("mitigation", ""),
                    "trigger": rule.get("trigger", ""),
                    "exposure": exposure,
                }

                risks.append(risk_obj)
                risk_id += 1

    return risks


# تخزين المخاطر في ملف JSON
def save_risks(project_id, risks):
    os.makedirs(DATA_DIR, exist_ok=True)

    file_path = f"{DATA_DIR}/project_{project_id}_risks.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump({"project_id": project_id, "risks": risks}, f, indent=2, ensure_ascii=False)


# قراءة المخاطر من الملف
def load_risks(project_id):
    file_path = f"{DATA_DIR}/project_{project_id}_risks.json"

    if not os.path.exists(file_path):
        return {"project_id": project_id, "risks": []}

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)
