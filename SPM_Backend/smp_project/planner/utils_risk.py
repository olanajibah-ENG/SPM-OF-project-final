def probability_to_percent(score: int) -> int:
    """
    Converts 1–5 into 20%–100%
    """
    return max(0, min(100, score * 20))


def impact_to_label(score: int, lang: str = "en") -> str:
    """
    Converts impact score into label:
    1–2 = Low / منخفض
    3 = Medium / متوسط
    4–5 = High / عالي
    """
    if score <= 2:
        return "منخفض" if lang == "ar" else "Low"
    elif score == 3:
        return "متوسط" if lang == "ar" else "Medium"
    else:
        return "عالي" if lang == "ar" else "High"
