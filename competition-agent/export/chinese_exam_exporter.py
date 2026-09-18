"""
Chinese exam exporter.

Convert reviewed bilingual datasets into the runtime exam format.
"""

import json
from pathlib import Path
from typing import Any, Dict, List


def export_chinese_exam(
    source: str,
    output: str,
    title: str = "Chinese Competition Exam",
) -> Dict[str, Any]:
    src = Path(source)
    dst = Path(output)

    data = json.loads(src.read_text(encoding="utf-8"))
    questions: List[Dict[str, Any]] = data if isinstance(data, list) else data.get("questions", [])

    exported = []
    for q in questions:
        zh = q.get("localized", {}).get("zh", {})
        exported.append(
            {
                "id": q.get("id"),
                "stem": zh.get("stem", ""),
                "options": zh.get("options", []),
                "language": "zh-CN",
                "status": q.get("translationStatus", "pending_translation"),
            }
        )

    result = {
        "schema": "competition-exam-zh-v1",
        "title": title,
        "language": "zh-CN",
        "questionCount": len(exported),
        "questions": exported,
    }

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    print("Chinese exam exporter ready")
