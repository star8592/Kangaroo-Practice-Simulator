#!/usr/bin/env python3
"""Build translation queue from indexed competition files."""

import json
from pathlib import Path

ROOT = Path(__file__).parent
INDEX = ROOT / "index.json"
OUT = ROOT / "translation_queue.json"


def build_queue():
    if not INDEX.exists():
        print("missing index.json")
        return

    items = json.loads(INDEX.read_text(encoding="utf-8"))
    queue = []

    for item in items:
        queue.append({
            "source": item.get("file"),
            "competition": item.get("competition", "unknown"),
            "status": "pending_translation",
            "target_language": "zh-CN"
        })

    OUT.write_text(
        json.dumps(queue, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"translation jobs: {len(queue)}")


if __name__ == "__main__":
    build_queue()
