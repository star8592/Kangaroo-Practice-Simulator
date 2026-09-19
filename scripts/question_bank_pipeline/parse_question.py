#!/usr/bin/env python3
"""Parse extracted PDF text into structured math questions.

This is a conservative first stage parser. It keeps source text intact and
only extracts stable structures: question number, statement and options.
Answer and solution enrichment are handled by later validation stages.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def split_questions(text: str):
    blocks = re.split(r"(?m)^\s*(\d{1,3})[\.、)]\s*", text)
    result = []
    for i in range(1, len(blocks), 2):
        number = blocks[i]
        body = blocks[i + 1].strip()
        if body:
            result.append(parse_block(number, body))
    return result


def parse_block(number: str, body: str):
    option_matches = re.split(r"(?m)\s(?=[A-E][\.、)])", body)
    question = option_matches[0].strip()
    options = []
    for item in option_matches[1:]:
        options.append(item.strip())
    return {
        "id": f"q-{number}",
        "questionNumber": int(number),
        "questionText": question,
        "options": options,
        "answer": None,
        "solution": None,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--output", default="questions.json")
    args = parser.parse_args()

    text = Path(args.input).read_text(encoding="utf-8")
    questions = split_questions(text)

    Path(args.output).write_text(
        json.dumps(questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
