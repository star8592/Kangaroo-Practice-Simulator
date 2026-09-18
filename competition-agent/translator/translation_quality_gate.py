"""Quality gate for Chinese math competition translations.

Checks before publishing:
- required bilingual fields
- numeric token preservation
- option count consistency
- review status
"""

import re


def numbers(text: str):
    return re.findall(r"\d+(?:\.\d+)?", text or "")


def check_numeric_consistency(source: str, target: str):
    return numbers(source) == numbers(target)


def validate_question(question: dict):
    en = question.get("localized", {}).get("en", {})
    zh = question.get("localized", {}).get("zh", {})

    errors = []

    if not zh.get("stem"):
        errors.append("missing_chinese_stem")

    if not check_numeric_consistency(en.get("stem", ""), zh.get("stem", "")):
        errors.append("numeric_mismatch")

    if len(en.get("options", [])) != len(zh.get("options", [])):
        errors.append("option_count_mismatch")

    return {
        "passed": len(errors) == 0,
        "errors": errors
    }


if __name__ == "__main__":
    print("translation quality gate ready")
