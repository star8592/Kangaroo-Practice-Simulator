#!/usr/bin/env python3
"""Validate a locally replicated encrypted backup, checksum and source receipt."""
import hashlib
import json
import re
import sys
from pathlib import Path

NAME=re.compile(r"^socthink-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}-[0-9]+\.tar\.zst\.gpg$")

def verify(root:Path,filename:str)->dict:
    if not NAME.fullmatch(filename):
        raise ValueError("invalid encrypted archive basename")
    archive=root/filename
    hashpath=root/(filename+".sha256")
    receipt=root/(filename+".receipt.json")
    for p in (archive,hashpath,receipt):
        if not p.is_file() or p.is_symlink():
            raise ValueError("off-host replica incomplete or symlinked")
    row=json.loads(receipt.read_text(encoding="utf-8"))
    if row.get("status")!="PASS" or row.get("isolatedRestore")!="PASS":
        raise ValueError("production restore has no PASS evidence")
    if row.get("archive")!=filename or row.get("sizeBytes")!=archive.stat().st_size:
        raise ValueError("receipt archive/size mismatch")
    digest=row.get("archiveSha256")
    if not isinstance(digest,str) or not re.fullmatch(r"[a-f0-9]{64}",digest):
        raise ValueError("bad production digest")
    text=hashpath.read_text(encoding="utf-8").strip()
    if text not in (digest+"  "+filename,digest+" *"+filename):
        raise ValueError("checksum file disagrees with production receipt")
    check=hashlib.sha256()
    with archive.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            check.update(chunk)
    if check.hexdigest()!=digest:
        raise ValueError("replicated ciphertext corrupted")
    return row

if __name__=="__main__":
    try:
        if len(sys.argv)!=3:
            raise ValueError("usage: verify_offsite_replica.py <directory> <archive_name>")
        result=verify(Path(sys.argv[1]),sys.argv[2])
        print("OFFSITE_REPLICA_VERIFY=PASS sha256="+result["archiveSha256"]+
              " restored_on_source="+result["isolatedRestore"])
    except Exception as e:
        print("OFFSITE_REPLICA_VERIFY=FAIL reason="+str(e)[:140],file=sys.stderr)
        sys.exit(1)
