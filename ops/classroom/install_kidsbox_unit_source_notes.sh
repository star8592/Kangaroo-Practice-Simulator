#!/usr/bin/env bash
# Install teacher-only observations from the verified scan, without public assets.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [[ ! "$1" =~ ^(1[0-2]|[1-9])$ ]]; then
 echo "Usage: install_kidsbox_unit_source_notes.sh <unit 1..12>"; exit 2
fi
UNIT="$1"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$REPO/ops/content/kids-box-student-1/unit$UNIT""_source_notes.json"
BASE="/var/lib/socthink/teacher-books"
if [ -n "$(printenv SOCTHINK_TEACHER_BOOKS_DIR || true)" ];then
 BASE="$(printenv SOCTHINK_TEACHER_BOOKS_DIR)"
fi
DEST="$BASE/kids-box-student-1/metadata"
test -f "$SRC" && test -f "$DEST/book_manifest.json"
python3 - "$SRC" "$DEST/book_manifest.json" "$DEST/unit$UNIT""_source_notes.json" "$UNIT" <<'PY'
from pathlib import Path
import json,os,sys
src,manifest,dst=map(Path,sys.argv[1:4]); unit=int(sys.argv[4])
book=json.loads(manifest.read_text(encoding="utf-8"))
note=json.loads(src.read_text(encoding="utf-8"))
sha="67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d"
assert book["source_sha256"]==note["source_sha256"]==sha
assert book["source_pdf_pages"]==94 and len(book["sections"])==18
assert note["schema"]==f"kidsbox1-unit{unit}-source-observed-v1"
assert note["book_id"]==book["id"]=="kids-box-student-1"
assert note["publish_status"]=="teacher_review_required"
section=next(s for s in book["sections"] if s["unit_number"]==unit and s["id"]==f"unit-{unit:02}")
pages=set(range(section["start_pdf_page"],section["end_pdf_page"]+1))
assert pages==set(map(int,note["pages"]))
assert all(note["pages"][str(p)]["printed_page"]==p-7 for p in pages)
assert all(note["pages"][str(p)]["requires_official_audio"] is True for p in pages)
assert all(isinstance(note["pages"][str(p)]["candidate_text"],str) for p in pages)
data=src.read_bytes()
if dst.exists() and dst.read_bytes()==data:
 print(f"R61_UNIT_SOURCE_NOTE_CURRENT=YES unit={unit} pages={len(pages)}")
 raise SystemExit
tmp=dst.with_suffix(".json.tmp")
with tmp.open("wb") as f:
 f.write(data);f.flush();os.fsync(f.fileno())
tmp.chmod(0o600)
os.replace(tmp,dst)
print(f"R61_PRIVATE_UNIT_SOURCE_NOTE_INSTALLED=YES unit={unit} pages={len(pages)}")
PY
