#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/"private/exams/kangaroo-grade1-2-official-samples-2006-2026.json"
d=json.loads(P.read_text())
qs=d.get("questions") or []
assert len(qs)==63,len(qs)
assert d.get("profile",{}).get("studentReady") is False
years=sorted({int(q["year"]) for q in qs})
assert years==list(range(2006,2027)),years
for year in years:
    row=[q for q in qs if int(q["year"])==year]
    assert len(row)==3,(year,len(row))
    assert sorted(q["points"] for q in row)==[3,4,5],year
for q in qs:
    assert q["answer"] in "ABCDE",q["id"]
    assert 2 in q.get("grades",[]),q["id"]
    assert q.get("gradeBand")=="1-2"
    assert q.get("stemEn","").strip()
    assert q.get("sourceMeta",{}).get("official") is True
    asset=ROOT/"public"/q["assetUrl"].lstrip("/")
    assert asset.exists() and asset.stat().st_size>1000,(q["id"],asset)
    src=Path(q["sourceFile"])
    assert src.exists() and src.stat().st_size>1000,(q["id"],src)
assert sum(q["points"] for q in qs)==252
print("KANGAROO_GRADE1_2_SAMPLE_BANK=PASS questions=63 years=21 tiers=21/21/21 assets=63 official_answers=63 grade2=true")
