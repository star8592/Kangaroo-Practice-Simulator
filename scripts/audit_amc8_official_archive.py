#!/usr/bin/env python3
"""Inventory-only AMC8 official-year coverage: no exam stems or images exported.

A 25-question local JSON file is NOT proof that it is an unaltered official
past paper and is NOT a grant of rights to offer that paper commercially.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

YEARS = tuple(year for year in range(1999, 2027) if year != 2021)


def audit(source: Path) -> dict:
    if not source.is_dir():
        raise FileNotFoundError("AMC8_ARCHIVE_SOURCE_NOT_FOUND")
    candidates: dict[int, list[dict]] = {y: [] for y in YEARS}
    fragments = []
    corrupt = []
    for path in sorted(source.glob("maa-amc8*.json")):
        try:
            d = json.loads(path.read_text(encoding="utf-8"))
            profile = d.get("profile", {})
            year = profile.get("year")
            questions = d.get("questions", [])
            if not isinstance(questions, list):
                raise ValueError("INVALID_QUESTION_LIST")
            meta = {
                "filename": path.name,
                "exam_id": profile.get("id"),
                "question_count": len(questions),
                "commercial_use_declared": profile.get("rightsPolicy", {}).get("commercialUse"),
                "source_comparison_verified": False,
                "rights_verified": False,
            }
            if year not in YEARS or len(questions) != 25 or profile.get("formatId") != "maa-amc8":
                fragments.append({"filename": path.name, "year": year, "question_count": len(questions)})
            else:
                candidates[year].append(meta)
        except (ValueError, TypeError, KeyError, AttributeError, json.JSONDecodeError):
            corrupt.append(path.name)
    rows = []
    for year in YEARS:
        items = candidates[year]
        if not items:
            status = "MISSING_LOCAL_FULL_PAPER"
        elif len(items) > 1:
            status = "CONFLICTING_CANDIDATES_NEEDS_REVIEW"
        elif "sample" in items[0]["filename"].lower():
            status = "SAMPLE_NEEDS_ORIGINAL_COMPARISON"
        else:
            status = "LOCAL_25Q_NEEDS_ORIGINAL_COMPARISON"
        rows.append({"year": year, "status": status, "candidates": items})
    count = sum(bool(x["candidates"]) for x in rows)
    return {
        "scope": "AMC8 official named annual series 1999–2026 excluding 2021",
        "notice": "Inventory metadata only. No official authenticity or commercial license is established.",
        "summary": {
            "expected_years": len(YEARS),
            "local_full_year_candidates": count,
            "missing_years": [r["year"] for r in rows if not r["candidates"]],
            "sample_years": [r["year"] for r in rows if r["status"].startswith("SAMPLE")],
            "commercially_authorized_years_verified": 0,
            "fragment_files": len(fragments),
            "corrupt_files": len(corrupt),
        },
        "years": rows,
        "fragments": fragments,
        "corrupt": corrupt,
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    a = p.parse_args()
    result = audit(a.source)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
