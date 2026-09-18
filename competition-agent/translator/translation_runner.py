"""Translation workflow orchestration.

Pipeline:
source question -> translation task -> zh review -> validation.
The actual expert translation content is produced in the review stage.
"""

from pathlib import Path
import json


def load_queue(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def next_pending(tasks):
    return [t for t in tasks if t.get("status") == "pending"]


def mark_completed(task, translation):
    task["translation"] = translation
    task["status"] = "translated"
    return task


if __name__ == "__main__":
    print("translation runner ready")
