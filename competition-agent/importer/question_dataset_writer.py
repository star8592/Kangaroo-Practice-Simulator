"""
Question dataset writer.

Converts extracted/OCR question records into the normalized English
question dataset format used by the translation pipeline.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Dict, Any


def normalize_question(item: Dict[str, Any], competition: str, year: int, grade: str):
    number = item.get("number", item.get("id", 0))
    return {
        "id": f"{competition.upper()}_{year}_{grade}_Q{int(number):03d}",
        "competition": competition,
        "year": year,
        "grade": grade,
        "language": "en",
        "stem": item.get("stem", ""),
        "options": item.get("options", []),
        "translationStatus": "pending_translation",
    }


def write_dataset(
    questions: Iterable[Dict[str, Any]],
    output: str,
    competition: str = "Kangaroo",
    year: int = 2025,
    grade: str = "G1",
):
    data = [normalize_question(q, competition, year, grade) for q in questions]
    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return target


if __name__ == "__main__":
    demo = [{"number": 1, "stem": "Example question", "options": []}]
    write_dataset(demo, "questions.en.json")
