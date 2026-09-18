"""Build Chinese localization records for competition questions.

Keep English source untouched and create a zh translation workspace.
"""

import json
from pathlib import Path


def build_zh_record(question):
    return {
        "id": question.get("id"),
        "localized": {
            "en": question.get("en", {}),
            "zh": {
                "stem": "",
                "options": [],
                "status": "pending_translation"
            }
        },
        "solution": {
            "zh": ""
        },
        "review": {
            "math_checked": False,
            "translation_checked": False
        }
    }


def build_dataset(source_path, output_path):
    data = json.loads(Path(source_path).read_text(encoding="utf-8"))
    result = [build_zh_record(item) for item in data]
    Path(output_path).write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


if __name__ == "__main__":
    print("zh question builder ready")
