#!/usr/bin/env bash
# Install source-bound auxiliary textbook hints into teacher-only storage.
# No student assignment creation, source PDF exposure, or deployment.
set -Eeuo pipefail
if [ "$#" -ne 0 ];then
  echo "Usage: install_kidsbox_supplementary_source_notes.sh" >&2
  exit 2
fi
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$REPO/ops/content/kids-box-student-1/supplementary_source_notes.json"
BASE="${SOCTHINK_TEACHER_BOOKS_DIR:-/var/lib/socthink/teacher-books}"
DEST="$BASE/kids-box-student-1/metadata"
test -f "$SRC" && test -f "$DEST/book_manifest.json"
python3 - "$SRC" "$DEST/book_manifest.json" "$DEST/supplementary_source_notes.json" <<'PY'
from pathlib import Path
import json,os,sys
src,manifest,dst=map(Path,sys.argv[1:])
book=json.loads(manifest.read_text(encoding="utf-8"))
source=json.loads(src.read_text(encoding="utf-8"))
sha="67e8ae9405469552379e29e18a1b2058865f12beb99907b3a2d88c5da50ac31d"
assert book["id"]==source["book_id"]=="kids-box-student-1"
assert book["source_sha256"]==source["source_sha256"]==sha
assert book["source_pdf_pages"]==94 and len(book["sections"])==18
assert source["schema"]=="kidsbox1-supplementary-source-observed-v1"
assert source["publish_status"]=="teacher_review_required"
covered={"review-01":(33,34),"review-02":(59,60),"review-03":(85,86),"word-list":(87,92)}
expected=set()
for section_id,(lo,hi) in covered.items():
    section=next(s for s in book["sections"] if s["id"]==section_id)
    assert section["unit_number"] is None
    assert (section["start_pdf_page"],section["end_pdf_page"])==(lo,hi)
    expected.update(range(lo,hi+1))
assert set(map(int,source["pages"]))==expected and len(expected)==12
for page,note in source["pages"].items():
    p=int(page)
    section_id=next(sid for sid,(lo,hi) in covered.items() if lo<=p<=hi)
    assert note["section_id"]==section_id
    assert note["printed_page"]==p-7
    assert note["candidate_text"]=="" and note["practice_words"]==[]
    assert note["read_questions"]==[] and note["templates"]==[] and note["phonics"]==[]
    assert note["requires_official_audio"] is True
    assert isinstance(note["lesson_activity"],list) and len(note["lesson_activity"])>0
    assert isinstance(note["note"],str) and len(note["note"])>5
raw=src.read_bytes()
if dst.exists() and dst.read_bytes()==raw:
    assert dst.stat().st_mode & 0o777 == 0o600
    print("KIDSBOX_SUPPLEMENTARY_CURRENT=YES pages=12")
    raise SystemExit(0)
tmp=dst.with_name(dst.name+".tmp")
with tmp.open("wb") as f:
    f.write(raw); f.flush(); os.fsync(f.fileno())
os.chmod(tmp,0o600)
os.replace(tmp,dst)
assert dst.stat().st_mode & 0o777 == 0o600
print("KIDSBOX_SUPPLEMENTARY_PRIVATE_INSTALLED=YES pages=12 permission=0600")
PY
