#!/usr/bin/env python3
"""Real source scanner for competition production.

Scans local source directories and prepares metadata for real PDF processing.
No fake questions are generated.
"""

from pathlib import Path
import json
import sys


def scan_sources(root: str):
    base = Path(root)
    results = []
    if not base.exists():
        return results

    for pdf in base.rglob("*.pdf"):
        name = pdf.name.lower()
        if "kangaroo" in name or "袋鼠" in name:
            results.append({
                "file": str(pdf),
                "competition": "Kangaroo",
                "status": "ready_for_extraction"
            })
    return results


def main():
    if len(sys.argv) < 2:
        print("usage: source_scan_runner.py <source_dir>")
        return

    data = scan_sources(sys.argv[1])
    Path("data/raw_scan").mkdir(parents=True, exist_ok=True)
    Path("data/raw_scan/kangaroo_sources.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(json.dumps({"found": len(data)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
