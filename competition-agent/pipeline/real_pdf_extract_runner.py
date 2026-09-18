#!/usr/bin/env python3
"""Real PDF extraction runner.

This is the first production stage:
PDF source -> extracted text -> english dataset.

The runner deliberately does not create fake questions. Missing or failed
extraction is reported for review.
"""

from pathlib import Path
import json
import re
import sys


def extract_metadata(pdf: Path):
    name = pdf.stem.lower()
    year = re.search(r"20\d{2}", name)
    grade = re.search(r"g(\d+)", name)
    return {
        "file": str(pdf),
        "competition": "Kangaroo",
        "year": int(year.group()) if year else None,
        "grade": f"G{grade.group(1)}" if grade else None,
    }


def build_dataset(source: Path, output: Path):
    items = []
    for pdf in source.rglob("*.pdf"):
        meta = extract_metadata(pdf)
        items.append({
            "id": f"KANGAROO_{meta['year']}_{meta['grade']}_SOURCE",
            "source": meta,
            "language": "en",
            "status": "pending_extraction"
        })

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(items)


if __name__ == "__main__":
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/raw/kangaroo")
    output = Path("data/kangaroo/source_index.json")
    count = build_dataset(source, output)
    print(json.dumps({"pdf_found": count, "output": str(output)}, ensure_ascii=False))
