"""
Exam builder for CompetitionBank Agent.

Converts normalized bilingual question records into exam packages
consumed by the practice simulator.
"""

import json
from pathlib import Path
from typing import List, Dict


def build_exam(questions: List[Dict], output: str):
    package = {
        "schema": "competition-exam-v1",
        "questionCount": len(questions),
        "questions": questions,
    }

    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(package, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return str(target)


if __name__ == "__main__":
    print("Exam builder ready")
