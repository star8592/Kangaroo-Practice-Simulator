#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "private" / "source-archive" / "cemc" / "manifest.json"
OUT = ROOT / "private" / "source-registry" / "cemc_ingestion_queue.json"
EUCLID_MANIFEST = ROOT / "private" / "source-digitization" / "cemc" / "euclid" / "manifest.json"

def main() -> None:
    data = json.loads(MANIFEST.read_text())
    items = []
    euclid_ready = EUCLID_MANIFEST.exists()
    status_counts = {}
    for r in data.get("records", []):
        comp = r["competition"]
        year = r["year"]
        grade = r["grade"]
        if comp == "Gauss":
            exam_id = f"cemc-gauss-{year}-grade-{grade}"
        elif comp == "Euclid":
            exam_id = None
        else:
            exam_id = f"cemc-{comp.lower()}-{year}"
        objective_ready = bool(exam_id and (ROOT / "private" / "exams" / f"{exam_id}.json").exists())
        if comp == "Euclid" and euclid_ready:
            status = "proof-source-digitized"
            next_step = "build-proof-response-mode-and-bilingual-localization-before-student-delivery"
        elif objective_ready:
            status = "objective-source-digitized"
            next_step = "bilingual-localization-and-review-before-student-delivery"
        else:
            status = "raw-collected"
            next_step = "digitize-original-pdf-structure-preserve-figures-add-attribution-then-review"
        status_counts[status] = status_counts.get(status, 0) + 1
        items.append({
            "sourceRegistryId": r["sourceRegistryId"],
            "competition": comp,
            "competitionId": r["competitionId"],
            "year": year,
            "grade": grade,
            "contestFile": r["contestFile"]["path"],
            "solutionFile": r["solutionFile"]["path"],
            "contestSha256": r["contestFile"]["sha256"],
            "solutionSha256": r["solutionFile"]["sha256"],
            "rights": r["rights"],
            "status": status,
            "nextStep": next_step,
        })
    OUT.write_text(json.dumps({
        "generatedAt": "2026-09-25",
        "count": len(items),
        "statusCounts": status_counts,
        "items": items,
    }, ensure_ascii=False, indent=2) + "\n")
    print(f"CEMC_INGESTION_QUEUE_OK count={len(items)} status={status_counts}")

if __name__ == "__main__":
    main()
