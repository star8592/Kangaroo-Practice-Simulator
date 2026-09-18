"""
Build bilingual competition questions.

Input: normalized English question object
Output: bilingual question object compatible with simulator schema.
"""


def build_bilingual_question(question_id, english_question, chinese_question=None):
    return {
        "id": question_id,
        "localized": {
            "en": english_question,
            "zh": chinese_question or {
                "status": "pending_translation"
            }
        },
        "translationStatus": "pending" if chinese_question is None else "draft"
    }
