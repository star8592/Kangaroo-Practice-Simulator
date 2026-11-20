#!/usr/bin/env bash
# R60 private teacher-book notes; no source PDF or images are published.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/ops/content/kids-box-student-1/unit1_source_notes.json"
BASE="/var/lib/socthink/teacher-books"
if [ -n "$(printenv SOCTHINK_TEACHER_BOOKS_DIR || true)" ]; then BASE="$(printenv SOCTHINK_TEACHER_BOOKS_DIR)"; fi
TARGET="$BASE/kids-box-student-1"
test -d "$TARGET/metadata" && test -f "$TARGET/metadata/book_manifest.json"
python3 - "$SRC" "$TARGET/metadata/book_manifest.json" "$TARGET/metadata/unit1_source_notes.json" <<'PY'
from pathlib import Path
import json,os,sys
src,manifest,target=map(Path,sys.argv[1:])
notes=json.loads(src.read_text(encoding='utf-8'))
book=json.loads(manifest.read_text(encoding='utf-8'))
sha="67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d"
assert notes["source_sha256"]==book["source_sha256"]==sha
assert notes["book_id"]=="kids-box-student-1"
assert notes["publish_status"]=="teacher_review_required"
assert len(book["sections"])==18 and book["source_pdf_pages"]==94
assert sorted(map(int,notes["pages"]))==list(range(9,15))
assert notes["pages"]["9"]["candidate_text"]==""
assert notes["pages"]["14"]["candidate_text"]==""
assert notes["pages"]["12"]["practice_words"]==["blue","green","orange","pink","purple","red","yellow"]
for p in range(9,15):
 assert notes["pages"][str(p)]["printed_page"]==p-7
data=src.read_bytes()
old=target.read_bytes() if target.exists() else b""
if old==data:
 print("R60_PRIVATE_SOURCE_NOTES_CURRENT=YES pages=6")
 raise SystemExit(0)
tmp=target.with_suffix(".json.tmp")
with tmp.open("wb") as f:
 f.write(data)
 f.flush()
 os.fsync(f.fileno())
os.chmod(tmp,0o600)
os.replace(tmp,target)
print("R60_PRIVATE_SOURCE_NOTES_INSTALLED=YES pages=6")
PY
