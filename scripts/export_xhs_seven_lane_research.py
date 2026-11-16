#!/usr/bin/env python3
"""Expose query provenance only, not screenshots, post content or user identity."""
from pathlib import Path
import json,hashlib,os
repo=Path(__file__).resolve().parents[1]
src=Path(os.environ["SOCTHINK_XHS_SCREEN_DIR"]).resolve(strict=True)
manifest=json.loads((src/"batch-manifest.json").read_text(encoding="utf-8"))
entries=[]
for e in manifest["entries"]:
    p=(src/e["evidenceFilename"]).resolve(strict=True)
    assert p.is_relative_to(src) and p.is_file()
    b=p.read_bytes()
    assert b.startswith(b"\x89PNG\r\n\x1a\n") and len(b)==e["bytes"]
    assert hashlib.sha256(b).hexdigest()==e["sha256"]
    entries.append({
       "lane":e["lane"],"query":e["query"],"observedAtUtc":e["observedAtUtc"],
       "privateEvidenceFilename":e["evidenceFilename"],
       "sha256":e["sha256"],"sizeBytes":e["bytes"],
       "state":"search_results_evidence_only",
       "originalPaperDownloaded":False,
       "ocrStatus":"not_attempted",
       "commercialSaleAllowed":False,
       "note":"One public search results screen; specific post URL, authenticity and completeness not independently verified."
    })
out={
  "schemaVersion":1,
  "capturedAt":"2026-10-31",
  "source":"S22 Ultra native Xiaohongshu public search UI",
  "scope":"7 low-frequency public keyword searches; screenshot bytes only on private Z890 disk",
  "queryCount":len(entries),
  "entries":entries
}
dst=repo/"data/discovery/xhs-seven-lane-search-batch-20261031.json"
dst.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("XHS_SEVEN_LANE_SCREEN_MANIFEST_VERIFIED",len(entries))
