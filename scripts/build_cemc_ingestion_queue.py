#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "private" / "source-archive" / "cemc" / "manifest.json"
OUT = ROOT / "private" / "source-registry" / "cemc_ingestion_queue.json"

def main() -> None:
    data = json.loads(MANIFEST.read_text())
    items = []
    for r in data.get("records", []):
        items.append({
            "sourceRegistryId": r["sourceRegistryId"],
            "competition": r["competition"],
            "competitionId": r["competitionId"],
            "year": r["year"],
            "grade": r["grade"],
            "contestFile": r["contestFile"]["path"],
            "solutionFile": r["solutionFile"]["path"],
            "contestSha256": r["contestFile"]["sha256"],
            "solutionSha256": r["solutionFile"]["sha256"],
            "rights": r["rights"],
            "status": "raw-collected",
            "nextStep": "digitize-original-pdf-structure-preserve-figures-add-attribution-then-review",
        })
    OUT.write_text(json.dumps({
        "generatedAt": "2026-09-25",
        "count": len(items),
        "items": items,
    }, ensure_ascii=False, indent=2) + "\n")
    print(f"CEMC_INGESTION_QUEUE_OK count={len(items)}")

if __name__ == "__main__":
    main()
