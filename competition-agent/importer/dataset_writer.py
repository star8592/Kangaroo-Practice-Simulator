"""Dataset writer for competition question ingestion.

Converts detected source metadata into the normalized English question dataset
format used by the translation pipeline.
"""

import json
from pathlib import Path
from datetime import datetime


def build_question_record(meta, index):
    return {
        "id": f"{meta.get('competition','UNKNOWN').upper()}_{meta.get('year','UNKNOWN')}_{meta.get('grade','UNKNOWN')}_Q{index:03d}",
        "source": meta.get("file"),
        "localized": {
            "en": {
                "stem": ""
            },
            "zh": {
                "stem": ""
            }
        },
        "translationStatus": "pending",
        "createdAt": datetime.utcnow().isoformat()
    }


def write_dataset(metadata_list, output):
    questions = [build_question_record(item, i + 1) for i, item in enumerate(metadata_list)]
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(
        json.dumps(questions, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return output


if __name__ == "__main__":
    print("dataset writer ready")
