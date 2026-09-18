"""Language selection runtime for competition exams.

Chinese-first policy:
- Load zh-CN when available.
- Never silently fallback to English when user selected Chinese.
"""

from pathlib import Path
import json


def load_exam(path, language="zh-CN"):
    data = json.loads(Path(path).read_text(encoding="utf-8"))

    if language == "zh-CN":
        zh = data.get("localized", {}).get("zh")
        if zh and zh.get("stem"):
            return {"language": "zh-CN", "content": zh}
        return {
            "language": "zh-CN",
            "status": "translation_pending",
            "message": "中文版本制作中"
        }

    return {
        "language": "en",
        "content": data.get("localized", {}).get("en", {})
    }


if __name__ == "__main__":
    print("language loader ready")
