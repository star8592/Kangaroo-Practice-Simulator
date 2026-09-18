"""Batch translation workflow for competition questions.

This module prepares translation jobs. It does not replace expert review.
The final Chinese mathematical wording must pass the quality gate.
"""

import json
from pathlib import Path


def load_questions(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def build_tasks(questions):
    tasks = []
    for q in questions:
        tasks.append({
            "id": q.get("id"),
            "status": "pending_translation",
            "target": "zh-CN"
        })
    return tasks


def save_tasks(tasks, output):
    Path(output).write_text(
        json.dumps(tasks, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


if __name__ == "__main__":
    print("batch translation queue builder ready")
