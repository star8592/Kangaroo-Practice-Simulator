#!/usr/bin/env python3
"""Remove expired classroom audio bytes, retaining grades without audio."""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path("/var/lib/socthink/accent-classroom/recordings")
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

def query(sql: str) -> str:
    p = subprocess.run(
        ["runuser", "-u", "postgres", "--", "/usr/bin/psql",
         "-X", "-At", "-v", "ON_ERROR_STOP=1", "-d", "accent_lab", "-c", sql],
        capture_output=True, text=True, timeout=30, check=True)
    return p.stdout.strip()

def safe_relative(tenant: str, attempt: str, key: str) -> Path | None:
    if not UUID.fullmatch(tenant) or not UUID.fullmatch(attempt):
        return None
    if key not in (f"{tenant}/{attempt}.webm", f"{tenant}/{attempt}.mp4"):
        return None
    return ROOT / key

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=250)
    args = parser.parse_args()
    if not 1 <= args.limit <= 1000:
        parser.error("--limit must be 1..1000")
    sql = f"""
    SELECT row_to_json(x)::text FROM (
      SELECT 'word'::text AS kind,tenant_id::text AS tenant,
             id::text AS attempt,recording_asset_key AS asset
      FROM accent.word_assignment_attempts
      WHERE audio_retention_until<=now() AND recording_deleted_at IS NULL
      UNION ALL
      SELECT 'sentence'::text,tenant_id::text,id::text,recording_asset_key
      FROM accent.pronunciation_attempts
      WHERE audio_retention_until<=now() AND recording_deleted_at IS NULL
    ) x LIMIT {args.limit};
    """
    count = 0
    for raw in filter(None, query(sql).splitlines()):
        row = json.loads(raw)
        kind,tenant,attempt,key = row["kind"],row["tenant"],row["attempt"],row["asset"]
        target = safe_relative(tenant, attempt, key)
        if target is None:
            raise ValueError("Unsafe classroom recording path; refusing deletion")
        if args.dry_run:
            count += 1
            continue
        if target.parent.is_symlink() or target.is_symlink():
            raise ValueError("Unexpected recording symlink")
        target.unlink(missing_ok=True)
        table = "accent.word_assignment_attempts" if kind == "word" else "accent.pronunciation_attempts"
        query(f"""UPDATE {table} SET recording_deleted_at=now()
              WHERE tenant_id='{tenant}'::uuid AND id='{attempt}'::uuid
                AND recording_deleted_at IS NULL
                AND audio_retention_until<=now();""")
        count += 1
    print(f"CLASSROOM_AUDIO_RETENTION={'DRY_RUN' if args.dry_run else 'PASS'} expired={count}")

if __name__ == "__main__":
    main()
