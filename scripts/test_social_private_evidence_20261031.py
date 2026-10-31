#!/usr/bin/env python3
"""Optional local private screenshot checksum verification; never publish screenshot bytes."""
from pathlib import Path
import os,hashlib,json
p=Path(__file__).resolve().parents[1]/"data/discovery/china-social-source-leads-20261031.json"
x=json.loads(p.read_text(encoding="utf-8"))
entries=[z for z in x["entries"] if z.get("limitedPrivateEvidence")]
assert len(entries)==2
assert all(not z["commercialSaleAllowed"] and not z["originalPaperDownloaded"] for z in entries)
if os.environ.get("SOCTHINK_SOCIAL_EVIDENCE_DIR"):
 root=Path(os.environ["SOCTHINK_SOCIAL_EVIDENCE_DIR"]).resolve(strict=True)
 for z in entries:
  e=z["limitedPrivateEvidence"]
  file=(root/e["fileName"]).resolve(strict=True)
  assert file.is_relative_to(root)
  b=file.read_bytes()
  assert b.startswith(b"\x89PNG") and len(b)==e["sizeBytes"]
  assert hashlib.sha256(b).hexdigest()==e["sha256"]
 print("PRIVATE_SCREENSHOT_EVIDENCE_SHA256_PASS",len(entries))
else:
 print("SOCIAL_EVIDENCE_METADATA_ONLY_PASS",len(entries))
