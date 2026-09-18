"""Build bilingual question objects following project schema."""


def build_bilingual_question(question_id: str, english: dict, chinese: dict | None = None):
    return {
        "id": question_id,
        "localized": {
            "en": english,
            "zh": chinese or {}
        },
        "translationStatus": "pending" if not chinese else "translated"
    }
