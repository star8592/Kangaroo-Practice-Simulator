"""
Real competition question parser.

Convert extracted PDF text into a normalized question dataset.
This parser intentionally keeps extraction conservative: it creates reviewable
English question records before translation.
"""

import json
import re
from pathlib import Path
from typing import List, Dict


QUESTION_PATTERNS = [
    re.compile(r"(?:Question\s*)?(\d+)[\.:)]\s*(.*)", re.I),
]

OPTION_PATTERN = re.compile(r"^([ABCDE])[\).:\s]+(.*)$")


def parse_questions(text: str) -> List[Dict]:
    questions = []
    current = None

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        q_match = None
        for pattern in QUESTION_PATTERNS:
            q_match = pattern.match(line)
            if q_match:
                break

        if q_match:
            if current:
                questions.append(current)
            current = {
                "number": int(q_match.group(1)),
                "stem": q_match.group(2).strip(),
                "options": [],
                "language": "en",
                "translationStatus": "pending_translation",
            }
            continue

        option = OPTION_PATTERN.match(line)
        if option and current:
            current["options"].append({
                "label": option.group(1),
                "text": option.group(2).strip(),
            })
            continue

        if current:
            current["stem"] += " " + line

    if current:
        questions.append(current)

    return questions


def write_dataset(text: str, output: str):
    data = {
        "schema": "competition-question-en-v1",
        "questions": parse_questions(text),
    }
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()

    text = Path(args.input).read_text(encoding="utf-8")
    write_dataset(text, args.output)
