#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "private" / "source-registry" / "competition_sources.json"
OUT = ROOT / "private" / "source-registry" / "rights_review_queue.json"

def main() -> None:
    data = json.loads(REGISTRY.read_text())
    items = []
    for source in data.get("sources", []):
        rights = source.get("rights") or {}
        if rights.get("publicQuestionDisplay"):
            continue
        items.append({
            "sourceRegistryId": source["id"],
            "organization": source["organization"],
            "competitionIds": source["competitionIds"],
            "priority": source["priority"],
            "reviewState": rights.get("reviewState"),
            "rightsClass": rights.get("class"),
            "evidenceUrls": rights.get("evidenceUrls") or [],
            "nextAction": "obtain-or-document-explicit-republication-basis-before-public-question-display",
        })
    order = {"S": 0, "A": 1, "B": 2, "C": 3}
    items.sort(key=lambda x: (order.get(x["priority"], 99), x["sourceRegistryId"]))
    OUT.write_text(json.dumps({
        "generatedAt": date.today().isoformat(),
        "count": len(items),
        "items": items,
    }, ensure_ascii=False, indent=2) + "\n")
    print(f"RIGHTS_REVIEW_QUEUE_OK count={len(items)}")

if __name__ == "__main__":
    main()
