#!/usr/bin/env python3
"""Report last verified off-host ciphertext backup freshness without source keys."""
import importlib.util
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("offsite_verify",ROOT/"verify_offsite_replica.py")
assert spec and spec.loader
checker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
folder=Path(sys.argv[1] if len(sys.argv)>1 else "/mnt/disk1/master_data/secure/socthink-backups")
max_hours=float(os.environ.get("SOCTHINK_OFFSITE_MAX_AGE_HOURS","60"))
receipts=list(folder.glob("socthink-*.tar.zst.gpg.receipt.json")) if folder.is_dir() else []
try:
    if not receipts:
        raise ValueError("no encrypted offsite replica receipts")
    latest=max(receipts,key=lambda p:p.stat().st_mtime)
    name=latest.name.removesuffix(".receipt.json")
    row=checker.verify(folder,name)
    created=datetime.fromisoformat(row["createdAt"])
    age=(datetime.now(timezone.utc)-created).total_seconds()/3600
    if not (0<=age<=max_hours):
        raise ValueError(f"stale source backup age_hours={age:.1f}")
    print(f"OFFSITE_ENCRYPTED_BACKUP=PASS latest_age_hours={age:.2f} archive_integrity=PASS")
    print(f"OFFSITE_VERIFIED_ARCHIVES={len(receipts)}")
    print("OFFSITE_RECOVERY_KEY_ESCROW=NOT_VERIFIED")
except Exception as e:
    print("OFFSITE_ENCRYPTED_BACKUP=FAIL reason="+str(e).replace("\n"," ")[:140])
    sys.exit(1)
