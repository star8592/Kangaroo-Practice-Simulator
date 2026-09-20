#!/usr/bin/env python3
"""
Competition Bank import pipeline.

Flow:
source files -> metadata -> question assets -> translation queue
"""

import json
import sys
from pathlib import Path

from pdf_batch_import import scan_directory
from dataset_writer import write_dataset


def run(source_dir: str, output_dir: str = "data/import"):
    source = Path(source_dir)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    records = scan_directory(source)

    metadata_file = output / "metadata.json"
    metadata_file.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    questions_file = output / "questions.en.json"
    write_dataset(records, questions_file)

    queue = []
    for item in records:
        queue.append({
            "source": item.get("source"),
            "targetLanguage": "zh-CN",
            "status": "pending_translation"
        })

    (output / "translation_queue.json").write_text(
        json.dumps(queue, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"Imported: {len(records)} PDF files")
    print(f"Output: {output}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_pipeline.py <source_dir> [output_dir]")
        sys.exit(1)

    run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "data/import")
