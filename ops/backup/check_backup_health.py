#!/usr/bin/env python3
"""Read-only health: latest encrypted artifact, receipt and checksum."""
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

root=Path(sys.argv[1] if len(sys.argv)>1 else "/var/backups/socthink-math")
max_hours=float(os.environ.get("SOCTHINK_BACKUP_MAX_AGE_HOURS","36"))
receipts=sorted(root.glob("socthink-*.tar.zst.gpg.receipt.json"),
                key=lambda p:p.stat().st_mtime,reverse=True) if root.is_dir() else []
if not receipts:
    print("LOCAL_ENCRYPTED_BACKUP=FAIL reason=missing_receipt")
    sys.exit(1)
try:
    row=json.loads(receipts[0].read_text(encoding="utf-8"))
    filename=row["archive"]
    assert Path(filename).name == filename and filename.endswith(".tar.zst.gpg")
    archive=root/filename
    assert archive.is_file() and (root/(filename+".sha256")).is_file()
    assert row["status"]=="PASS" and row["isolatedRestore"]=="PASS"
    assert row["sizeBytes"]==archive.stat().st_size
    check=hashlib.sha256()
    with archive.open("rb") as f:
        for block in iter(lambda:f.read(1024*1024),b""):
            check.update(block)
    assert check.hexdigest()==row["archiveSha256"]
    recorded=datetime.fromisoformat(row["createdAt"])
    age=(datetime.now(timezone.utc)-recorded).total_seconds()/3600
    assert 0<=age<=max_hours, f"stale backup age_hours={age:.2f}"
    print(f"LOCAL_ENCRYPTED_BACKUP=PASS age_hours={age:.2f} sha256=PASS")
    print("ISOLATED_RESTORE_DRILL=PASS receipt_verified=yes")
    print("OFFSITE_ENCRYPTED_BACKUP="+str(row.get("offHostReplica","UNKNOWN")))
except Exception as e:
    print("LOCAL_ENCRYPTED_BACKUP=FAIL reason="+str(e).replace("\n"," ")[:130])
    sys.exit(1)
