"""Generate solution metadata for translated competition questions.

Creates a structured solution placeholder that can later be filled by
expert mathematical explanation generation.
"""

from pathlib import Path
import json


def build_solution(question_id, knowledge=None):
    return {
        "id": question_id,
        "solution": {
            "zh": ""
        },
        "knowledge": knowledge or [],
        "difficulty": "pending",
        "review": {
            "math_checked": False,
            "solution_checked": False
        }
    }


def generate(input_file, output_file):
    data = json.loads(Path(input_file).read_text(encoding="utf-8"))
    result = []

    for item in data:
        result.append(build_solution(item.get("id", "unknown")))

    Path(output_file).write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


if __name__ == "__main__":
    print("solution generator ready")
