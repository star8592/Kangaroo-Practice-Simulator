#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "private" / "source-registry" / "competition_sources.json"
OUT = ROOT / "private" / "source-registry" / "collection_plan.json"
ORDER = {"S": 0, "A": 1, "B": 2, "C": 3}

def main() -> None:
    data = json.loads(REGISTRY.read_text())
    rows = []
    for s in data["sources"]:
        rights = s["rights"]
        rows.append({
            "sourceRegistryId": s["id"],
            "priority": s["priority"],
            "organization": s["organization"],
            "competitionIds": s["competitionIds"],
            "collectionMode": s["collection"]["mode"],
            "publicQuestionDisplay": rights["publicQuestionDisplay"],
            "reviewState": rights["reviewState"],
            "nextAction": (
                "collect-and-publish-with-attribution"
                if rights["publicQuestionDisplay"]
                else "collect-internally-and-complete-rights-review"
            ),
        })
    rows.sort(key=lambda r: (ORDER.get(r["priority"], 99), r["sourceRegistryId"]))
    payload = {
        "generatedFrom": str(REGISTRY.relative_to(ROOT)),
        "siteMode": data["siteMode"],
        "items": rows,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(f"COLLECTION_PLAN_OK items={len(rows)} output={OUT.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
