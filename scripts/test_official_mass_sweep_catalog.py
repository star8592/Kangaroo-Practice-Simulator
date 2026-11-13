#!/usr/bin/env python3
"""Verify no fabricated source files, years, sale claims or private paths in mass sweep index."""
import json
from collections import Counter
from pathlib import Path
p=Path(__file__).resolve().parents[1]/"data/discovery/official-original-mass-sweep-20261031.json"
d=json.loads(p.read_text(encoding="utf-8"))
rows=d["files"]
assert d["officialPdfCandidates"]==len(rows) and len(rows)>100
assert len({r["originalUrl"] for r in rows})==len(rows)
assert d["yearPriority"]==[2027,2026,2025,2024]
assert all(r["domain"] in {"school","math-competition","language","university","career","professional","interest"} for r in rows)
assert all(r["examYear"] is None or r["examYear"] in (2024,2025,2026,2027) for r in rows)
assert all(r["originalUrl"].startswith("https://") and r["sourcePage"].startswith("https://") for r in rows)
assert all(not r["commercialSaleAllowed"] and not r["publicDownload"] and not r["ocrPerformed"] for r in rows)
assert all("private/raw-source-archive/" not in str(r) and "/mnt/disk1/" not in str(r) for r in rows)
assert d["notAttempted"]==sum(r["archiveStatus"]=="not_attempted" for r in rows)
assert d["downloadFailures"]==sum(r["archiveStatus"]=="failed" for r in rows)
assert d["downloadedOrExistingFromSweep"]==sum(r["archiveStatus"] in ("downloaded","existing_same_url","already_archived_in_original_batch") for r in rows)
assert all(len(r["sha256"])==64 and r["sizeBytes"]>800 for r in rows if r["archiveStatus"] in ("downloaded","existing_same_url","already_archived_in_original_batch"))
assert d["officialPdfCandidates"]>=d["downloadedOrExistingFromSweep"]
print("OFFICIAL_ORIGINAL_MASS_SWEEP_PUBLIC_INDEX=PASS",len(rows))
