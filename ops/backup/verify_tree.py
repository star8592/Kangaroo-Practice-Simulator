#!/usr/bin/env python3
"""Validate the restored SocThink data tree without touching live data."""
import json
import os
import sys
from pathlib import Path

REQUIRED = (
    "private/users/users.json",
    "private/users/exam-sessions.json",
    "private/users/exam-attempts.jsonl",
    "private/arithmetic/sessions.jsonl",
)
ROOT_DIRS = ("private", "public/local-assets", "public/generated-solutions")

def audit(root: Path) -> dict:
    root = root.resolve(strict=True)
    for folder in ROOT_DIRS:
        p = root / folder
        if not p.is_dir() or p.is_symlink():
            raise ValueError(f"missing required directory: {folder}")
    for rel in REQUIRED:
        p = root / rel
        if not p.is_file() or p.is_symlink():
            raise ValueError(f"missing critical file: {rel}")
    count, nbytes, json_rows = 0, 0, 0
    for p in root.rglob("*"):
        if p.is_symlink():
            # Symlinks within real assets can be legitimate, but we must not
            # follow them while auditing the restored archive.
            if not p.resolve().is_relative_to(root):
                raise ValueError("archive contains external symlink: " + str(p.relative_to(root)))
            continue
        if not p.is_file():
            continue
        count += 1
        nbytes += p.stat().st_size
        rel = p.relative_to(root).as_posix()
        if rel.startswith(("private/users/","private/arithmetic/")):
            if rel.endswith(".json"):
                with p.open(encoding="utf-8") as f:
                    json.load(f)
                json_rows += 1
            elif rel.endswith(".jsonl"):
                with p.open(encoding="utf-8") as f:
                    for line_no, line in enumerate(f, 1):
                        if not line.strip():
                            continue
                        try:
                            json.loads(line)
                        except json.JSONDecodeError as exc:
                            raise ValueError(f"invalid JSONL in {rel} line {line_no}") from exc
                        json_rows += 1
    if count < len(REQUIRED):
        raise ValueError("restored archive is unexpectedly empty")
    return {"files":count,"bytes":nbytes,"validatedJsonOrJsonlRecords":json_rows,"roots":len(ROOT_DIRS)}

if __name__ == "__main__":
    try:
        print("BACKUP_RESTORED_TREE=PASS " + json.dumps(audit(Path(sys.argv[1])),sort_keys=True))
    except Exception as exc:
        print("BACKUP_RESTORED_TREE=FAIL "+str(exc), file=sys.stderr)
        sys.exit(1)
