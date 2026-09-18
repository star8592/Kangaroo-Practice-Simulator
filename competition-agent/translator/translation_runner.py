#!/usr/bin/env python3
"""
Competition translation pipeline entry.

Flow:
translation queue
    -> bilingual zh skeleton
    -> expert Chinese translation review
    -> validation
    -> publishable dataset
"""

import json
from pathlib import Path


def build_translation_dataset(queue_file: str, output_file: str):
    queue = json.loads(Path(queue_file).read_text(encoding="utf-8"))

    dataset = []
    for item in queue:
        dataset.append({
            "id": item.get("id"),
            "localized": {
                "en": item.get("en", {}),
                "zh": {
                    "status": "pending_translation",
                    "stem": "",
                    "options": []
                }
            },
            "solution": {
                "zh": ""
            },
            "review": {
                "math_checked": False,
                "translation_checked": False
            }
        })

    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    Path(output_file).write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("usage: translation_runner.py queue.json output.json")
        raise SystemExit(1)
    build_translation_dataset(sys.argv[1], sys.argv[2])
