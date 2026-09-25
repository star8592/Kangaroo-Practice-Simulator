#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "private" / "source-digitization" / "cemc" / "euclid" / "manifest.json"


def fail(msg: str):
    raise SystemExit(f"CEMC_EUCLID=FAIL {msg}")


def main():
    data = json.loads(MANIFEST.read_text())
    if data.get("paperCount") != 10 or data.get("questionUnits") != 100:
        fail("expected 10 papers / 100 question units")
    years = []
    image_count = 0
    for record in data.get("records", []):
        years.append(record.get("year"))
        if record.get("license") != "CC BY-NC 4.0":
            fail(f"{record.get('year')}: missing license")
        if record.get("studentReady") is not False:
            fail(f"{record.get('year')}: must remain source-only")
        qs = record.get("questions") or []
        if len(qs) != 10:
            fail(f"{record.get('year')}: question count")
        for i, q in enumerate(qs, 1):
            if q.get("questionNo") != i:
                fail(f"{record.get('year')}: numbering")
            for key in ("problemImages", "solutionImages"):
                imgs = q.get(key) or []
                if not imgs:
                    fail(f"{record.get('year')} Q{i}: {key} empty")
                for path in imgs:
                    if not Path(path).exists():
                        fail(f"{record.get('year')} Q{i}: missing {path}")
                    image_count += 1
    if sorted(years) != list(range(2017, 2027)):
        fail(f"years={sorted(years)}")
    print(f"CEMC_EUCLID=PASS papers=10 questions=100 images={image_count}")


if __name__ == "__main__":
    main()
