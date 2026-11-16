#!/usr/bin/env python3
"""Original provenance index contract and optional private SHA256 verification."""
import argparse
import hashlib
import json
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument("--archive-root",default=None,help="Explicit private original archive; not needed on public CI")
args = p.parse_args()
index_path=Path(__file__).resolve().parents[1]/"data/discovery/originals-retrieved-20261031.json"
x=json.loads(index_path.read_text(encoding="utf-8"))
assert x["yearPriority"]==[2027,2026,2025,2024]
assert x["privateOriginalFileCount"]==len(x["items"])
assert x["privateOriginalBytes"]==sum(i["sizeBytes"] for i in x["items"])
assert x["saleableCount"]==0 and x["ocrPerformed"] is False
assert len(set(i["id"] for i in x["items"]))==len(x["items"])
domains={i["domain"] for i in x["items"]}
assert domains.issubset({"school","math-competition","language","university","career","professional","interest"})
for i in x["items"]:
    assert i["examYear"] in x["yearPriority"]
    assert i["sourceUrl"].startswith("https://")
    assert i["sourceFileState"]=="downloaded_private_original"
    assert i["redistributionRights"]=="not_verified"
    assert i["commercialSaleAllowed"] is False and i["productStatus"]=="not_for_sale"
    assert len(i["sha256"])==64 and i["sizeBytes"]>1000
    assert i["ocrState"]=="not_started"
    assert "local_file" not in i
if args.archive_root:
    root=Path(args.archive_root).resolve(strict=True)
    n=0
    for i in x["items"]:
        file=root/i["domain"]/str(i["examYear"])/i["originalFilename"]
        assert file.is_file(),str(file)
        b=file.read_bytes()
        assert b.startswith(b"%PDF"),str(file)
        assert len(b)==i["sizeBytes"],str(file)
        assert hashlib.sha256(b).hexdigest()==i["sha256"],str(file)
        n+=1
    print("PRIVATE_ORIGINAL_SHA256_RECHECK=PASS",n)
print("ORIGINAL_PROVENANCE_INDEX=PASS",len(x["items"]))
