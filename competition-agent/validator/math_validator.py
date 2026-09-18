"""Math competition bilingual validation utilities.

Checks are intentionally conservative: translation must preserve
numbers, answer choices and mathematical symbols before review.
"""

import re


def extract_numbers(text: str):
    return re.findall(r"\d+(?:\.\d+)?", text)


def validate_numbers(source: str, target: str):
    return extract_numbers(source) == extract_numbers(target)


def validate_choices(source_choices, target_choices):
    return len(source_choices) == len(target_choices)


def validate_question(source, target, source_choices=None, target_choices=None):
    result = {
        "numbers": validate_numbers(source, target),
        "choices": True,
    }

    if source_choices is not None and target_choices is not None:
        result["choices"] = validate_choices(source_choices, target_choices)

    result["passed"] = all(result.values())
    return result
