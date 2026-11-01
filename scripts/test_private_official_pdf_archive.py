#!/usr/bin/env python3
"""Verify locally stored private PDFs without OCR, copying or publication."""
from collections import Counter
import hashlib,json,os
from pathlib import Path
root=Path(os.environ["SOCTHINK_RAW_ARCHIVE_DIR"]).resolve(strict=True)
mass=json.loads((root/"mass-sweep-manifest.json").read_text(encoding="utf-8"))
old=json.loads((root/"manifest.json").read_text(encoding="utf-8"))
ukmt=json.loads((root/"ukmt-extra-manifest.json").read_text(encoding="utf-8"))
verified=[]
all_hashes=[]
def verify_file(path,expected_sha,expected_bytes):
    path=path.resolve(strict=True)
    assert path.is_relative_to(root),str(path)
    raw=path.read_bytes()
    assert raw.startswith(b"%PDF"),str(path)
    assert hashlib.sha256(raw).hexdigest()==expected_sha,(str(path),"SHA mismatch")
    assert len(raw)==expected_bytes,(str(path),"size mismatch")
    verified.append(path)
    all_hashes.append(expected_sha)
for row in mass.get("entries",[]):
    if row["status"] in ("downloaded","existing_same_url"):
        verify_file(root/row["stored_relpath"],row["sha256"],row["size_bytes"])
    else:
        assert row["status"] in ("already_archived_in_original_batch","failed")
for row in old.get("items",[]):
    if row.get("sha256"):verify_file(Path(row["local_file"]),row["sha256"],row["size_bytes"])
for row in ukmt.get("items",[]):
    if row.get("state") in ("downloaded","already_downloaded"):
        verify_file(root/"math-competition"/str(row["year"])/"ukmt-direct"/row["file"],row["sha256"],row["size_bytes"])
print("VERIFIED_PHYSICAL_PDFS",len(verified))
print("DISTINCT_SHA256_CONTENTS",len(set(all_hashes)))
print("MASS_BATCH_SUCCESS",sum(x["status"] in ("downloaded","existing_same_url","already_archived_in_original_batch") for x in mass["entries"]))
print("MASS_BATCH_FAILED",sum(x["status"]=="failed" for x in mass["entries"]))
print("ALL_THIRD_PARTY_SALE_DISABLED",all(not x.get("public_sale_enabled") for x in mass["entries"]))
