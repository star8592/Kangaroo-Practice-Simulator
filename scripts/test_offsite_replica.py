#!/usr/bin/env python3
"""Offline replication proof with synthetic encrypted bytes (no live secrets)."""
import hashlib
from datetime import datetime,timezone
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"ops/backup/verify_offsite_replica.py"
spec=importlib.util.spec_from_file_location("offsite_verify",SOURCE)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
name="socthink-20261010T032745Z-"+("a"*12)+"-948269.tar.zst.gpg"
with tempfile.TemporaryDirectory(prefix="socthink-offsite-fixture-") as td:
    out=Path(td)
    archive=out/name
    archive.write_bytes(os.urandom(8192))
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    (out/(name+".sha256")).write_text(digest+"  "+name+"\n")
    row={"status":"PASS","isolatedRestore":"PASS","archive":name,
         "sizeBytes":archive.stat().st_size,"archiveSha256":digest,
         "gitShaAtSnapshot":"a"*12,"createdAt":datetime.now(timezone.utc).isoformat()}
    (out/(name+".receipt.json")).write_text(json.dumps(row))
    assert module.verify(out,name)["sizeBytes"]==8192
    def reject(fn):
        try:fn()
        except (ValueError,AssertionError):return
        raise AssertionError("offsite verifier failed to reject mutated backup")
    reject(lambda:module.verify(out,"../something.tar.zst.gpg"))
    reject(lambda:module.verify(out,"socthink-other-name.tar.zst.gpg"))
    orig=archive.read_bytes()
    archive.write_bytes(orig[:-1]+b"X")
    reject(lambda:module.verify(out,name))
    archive.write_bytes(orig)
    (out/(name+".sha256")).write_text("0"*64+"  "+name+"\n")
    reject(lambda:module.verify(out,name))
    (out/(name+".sha256")).write_text(digest+"  "+name+"\n")
    row["isolatedRestore"]="UNKNOWN"
    (out/(name+".receipt.json")).write_text(json.dumps(row))
    reject(lambda:module.verify(out,name))
    row["isolatedRestore"]="PASS"
    (out/(name+".receipt.json")).write_text(json.dumps(row))
    assert module.verify(out,name)["archiveSha256"]==digest
    env={**os.environ,"SOCTHINK_OFFSITE_MAX_AGE_HOURS":"100000"}
    status=subprocess.run(["python3",str(ROOT/"ops/backup/check_offsite_health.py"),str(out)],env=env,capture_output=True,text=True)
    assert status.returncode==0,(status.stdout,status.stderr)
    assert "OFFSITE_ENCRYPTED_BACKUP=PASS" in status.stdout
    (out/(name+".sha256")).unlink()
    (out/(name+".sha256")).symlink_to(archive)
    reject(lambda:module.verify(out,name))
    script=(ROOT/"ops/backup/pull_offsite_encrypted.sh").read_text()
    assert "StrictHostKeyChecking=yes" in script
    assert "SOCTHINK_OFFSITE_DIR" in script
    assert "OFFSITE_PULL=PASS" in script
    assert "--bwlimit=16384" in script
    assert "mv -- \"$STAGING/$RECEIPT\" \"$OUT/$RECEIPT\"" in script
    units=(ROOT/"ops/backup/socthink-offsite-backup-pull.service").read_text()
    assert "User=root" not in units and "NoNewPrivileges=yes" in units
    print("OFFSITE_REPLICA_TEST=PASS sha256=PASS tamper=BLOCKED fake_receipt=BLOCKED symlink=BLOCKED ssh_pin=PASS")
