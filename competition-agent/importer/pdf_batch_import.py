#!/usr/bin/env python3
"""Competition PDF batch importer foundation.

Scans competition documents and prepares metadata for question extraction.
"""

from pathlib import Path
import re
import json
import sys


def detect_metadata(path: Path):
    name = path.name.lower()
    competition = "Unknown"
    if "kangaroo" in name or "袋鼠" in name:
        competition = "Kangaroo"
    elif "amc" in name:
        competition = "AMC"

    year_match = re.search(r"20\d{2}", name)
    year = int(year_match.group()) if year_match else None

    grade = None
    grade_match = re.search(r"g(\d+)", name)
    if grade_match:
        grade = f"G{grade_match.group(1)}"

    return {
        "source": str(path),
        "competition": competition,
        "year": year,
        "grade": grade,
        "language": "en",
        "translationStatus": "pending"
    }


def scan_directory(root):
    results = []
    for path in Path(root).rglob("*.pdf"):
        results.append(detect_metadata(path))
    return results


def main():
    if len(sys.argv) < 2:
        print("usage: pdf_batch_import.py <directory>")
        return

    items = scan_directory(sys.argv[1])
    print(json.dumps(items, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
