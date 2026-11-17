#!/usr/bin/env python3
"""Single event-driven Rust catalog refresh after verified content deployment."""
from pathlib import Path
import subprocess

path=Path("ops/data/promote_student_ready.sh")
source=path.read_text()
assert source.count("SOCTHINK_RUST_CATALOG_INTERNAL_URL=http://127.0.0.1:37871")==2
assert source.count("socthink-catalog.service")==2
assert source.index('log "refresh Rust catalogue after verified exam publication"') > source.index("PUBLIC_ASSET_SHA")
assert source.index('log "refresh Rust catalogue after verified exam publication"') < source.index('log "write production data release receipt"')
assert source.index("# Recreate the Rust metadata after restoring original exam bundles.") < source.index('REMOTE\n  exit "$rc"')
assert source.index('if [[ "$DRY_RUN" == "1" ]]') < source.index('log "refresh Rust catalogue after verified exam publication"')
subprocess.run(["bash","-n",str(path)],check=True)
print("RUST_CATALOG_EVENT_REFRESH=PASS once_after_verified_publish=true rollback_republishes_old=true")
