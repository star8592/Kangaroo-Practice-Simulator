"""
Chinese translation engine entrypoint.

Responsibilities:
- convert English competition question records into zh-CN translation tasks
- keep original math structure unchanged
- prepare fields for reviewed Chinese content

The actual mathematical translation content is reviewed before publication.
"""

from copy import deepcopy
from typing import Dict, List


def build_translation_record(question: Dict) -> Dict:
    """Create a bilingual translation record from an English question."""
    record = deepcopy(question)

    record.setdefault("localized", {})
    record["localized"].setdefault("en", {
        "stem": question.get("stem", ""),
        "options": question.get("options", [])
    })

    record["localized"]["zh"] = {
        "stem": "",
        "options": [],
        "status": "pending_translation"
    }

    record["translation"] = {
        "source_language": "en",
        "target_language": "zh-CN",
        "status": "pending_review"
    }

    return record


def build_translation_batch(questions: List[Dict]) -> List[Dict]:
    return [build_translation_record(q) for q in questions]


if __name__ == "__main__":
    sample = {
        "id": "KANGAROO_2025_G1_Q001",
        "stem": "Example question",
        "options": []
    }
    print(build_translation_record(sample))
