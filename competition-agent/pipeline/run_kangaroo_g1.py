#!/usr/bin/env python3
"""
Kangaroo G1 pipeline entrypoint.

Purpose:
- prepare the first real competition data pipeline
- connect import, translation queue and validation stages

This runner intentionally keeps stages explicit so each stage can be verified.
"""

from pathlib import Path
import json
import sys


def create_workspace(output: Path):
    output.mkdir(parents=True, exist_ok=True)
    for name in ["questions.en.json", "questions.zh.json", "solutions.zh.json"]:
        path = output / name
        if not path.exists():
            path.write_text("[]\n", encoding="utf-8")


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("sources/kangaroo/G1/2025")
    output = Path("data/kangaroo/G1/2025")

    print("=== Kangaroo G1 Pipeline ===")
    print(f"Source: {source}")
    print(f"Output: {output}")

    create_workspace(output)

    report = {
        "competition": "Kangaroo",
        "grade": "G1",
        "year": 2025,
        "source": str(source),
        "stages": [
            "import",
            "translation_queue",
            "zh_validation",
            "exam_export"
        ]
    }

    (output / "pipeline_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("Pipeline workspace ready")


if __name__ == "__main__":
    main()
