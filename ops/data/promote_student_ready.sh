#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-root@socthink.cn}"
REMOTE_APP="${REMOTE_APP:-/opt/socthink-math}"
REMOTE_SERVICE="${REMOTE_SERVICE:-socthink-math.service}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"
DRY_RUN="${DRY_RUN:-0}"

cd "$ROOT"
TMP="$(mktemp -d /tmp/student-ready-promotion.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

log(){ printf '\n[student-ready-promotion] %s\n' "$*"; }
die(){ echo "[student-ready-promotion] ERROR: $*" >&2; exit 1; }

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "tracked working tree must be clean"
fi

LOCAL_SHA="$(git rev-parse HEAD)"
ORIGIN_SHA="$(git rev-parse origin/main)"
[[ "$LOCAL_SHA" == "$ORIGIN_SHA" ]] || die "local HEAD is not origin/main"

PUBLIC_JSON="$(curl -fsS "$PUBLIC_URL/api/release")"
DEPLOYED_SHA="$(python3 - "$PUBLIC_JSON" <<'PY'
import json,sys
print(json.loads(sys.argv[1]).get("deployedSha",""))
PY
)"
[[ "$DEPLOYED_SHA" == "$LOCAL_SHA" ]] || die "production code must match local HEAD before student-ready promotion"

build_manifest(){
  node_modules/.bin/tsx scripts/build_student_ready_manifest.ts
}

remote_manifest(){
  ssh -o BatchMode=yes "$REMOTE_HOST" \
    "cd '$REMOTE_APP' && node_modules/.bin/tsx scripts/build_student_ready_manifest.ts"
}

log "build local and production student-ready manifests"
build_manifest > "$TMP/local.json"
remote_manifest > "$TMP/remote-before.json"

python3 - "$TMP/local.json" "$TMP/remote-before.json" "$TMP/files.txt" "$TMP/exams.txt" <<'PY'
import json,sys
local=json.load(open(sys.argv[1],encoding="utf-8"))
remote=json.load(open(sys.argv[2],encoding="utf-8"))
files_path, exams_path=sys.argv[3],sys.argv[4]
rb={b["examId"]:b for b in remote.get("bundles",[])}
files=set()
exams=[]
for b in local.get("bundles",[]):
    old=rb.get(b["examId"])
    changed_exam=old is None or old.get("examSha256") != b["examSha256"]
    old_assets={a["path"]:a["sha256"] for a in (old or {}).get("assets",[])}
    changed_assets=[
        a["path"] for a in b.get("assets",[])
        if old_assets.get(a["path"]) != a["sha256"]
    ]
    if changed_exam or changed_assets:
        files.add(b["examPath"])
        files.update(a["path"] for a in b.get("assets",[]))
        exams.append(b["examId"])
open(files_path,"w",encoding="utf-8").write("".join(f+"\n" for f in sorted(files)))
open(exams_path,"w",encoding="utf-8").write("".join(x+"\n" for x in sorted(exams)))
print(json.dumps({
    "localReadyBundles":local.get("bundleCount",0),
    "localReadyQuestions":local.get("questionCount",0),
    "productionReadyBundles":remote.get("bundleCount",0),
    "productionReadyQuestions":remote.get("questionCount",0),
    "changedBundles":len(exams),
    "filesToSync":len(files),
},ensure_ascii=False))
PY

FILE_COUNT="$(wc -l < "$TMP/files.txt" | tr -d ' ')"
EXAM_COUNT="$(wc -l < "$TMP/exams.txt" | tr -d ' ')"

if [[ "$FILE_COUNT" -eq 0 ]]; then
  log "nothing to publish; production already matches all local STUDENT_READY bundles"
  exit 0
fi

log "validated $EXAM_COUNT changed STUDENT_READY bundles, $FILE_COUNT files including assets"

if [[ "$DRY_RUN" == "1" ]]; then
  rsync -ani --files-from="$TMP/files.txt" ./ "$REMOTE_HOST:$REMOTE_APP/" | head -200 || true
  log "DRY_RUN complete"
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
REMOTE_BACKUP="/opt/socthink-math-backups/student-ready-$STAMP.tar.gz"
scp -q "$TMP/files.txt" "$REMOTE_HOST:/tmp/student-ready-files-$STAMP.txt"

log "backup production data touched by this release"
ssh -o BatchMode=yes "$REMOTE_HOST" bash -s -- \
  "$REMOTE_APP" "$REMOTE_BACKUP" "/tmp/student-ready-files-$STAMP.txt" <<'REMOTE'
set -Eeuo pipefail
APP="$1"
BACKUP="$2"
LIST="$3"
EXISTING="${LIST}.existing"
cd "$APP"
: > "$EXISTING"
while IFS= read -r f; do
  [[ -f "$f" ]] && printf '%s\n' "$f" >> "$EXISTING"
done < "$LIST"
mkdir -p "$(dirname "$BACKUP")"
if [[ -s "$EXISTING" ]]; then
  tar -czf "$BACKUP" -T "$EXISTING"
else
  tar -czf "$BACKUP" --files-from=/dev/null
fi
REMOTE

log "sync verified student-ready bundles and their referenced assets"
rsync -a --files-from="$TMP/files.txt" ./ "$REMOTE_HOST:$REMOTE_APP/"

sha256sum $(cat "$TMP/files.txt") | sort -k2 > "$TMP/local.sha256"
ssh -o BatchMode=yes "$REMOTE_HOST" \
  "cd '$REMOTE_APP'; sha256sum \$(cat '/tmp/student-ready-files-$STAMP.txt') | sort -k2" \
  > "$TMP/remote.sha256"
if ! diff -u "$TMP/local.sha256" "$TMP/remote.sha256" >/dev/null; then
  die "remote file hash mismatch before rebuild"
fi

rollback(){
  rc=$?
  trap - ERR
  echo "[student-ready-promotion] deployment failed, restoring data backup" >&2
  ssh -o BatchMode=yes "$REMOTE_HOST" bash -s -- \
    "$REMOTE_APP" "$REMOTE_SERVICE" "$REMOTE_BACKUP" "/tmp/student-ready-files-$STAMP.txt" <<'REMOTE' || true
set -Eeuo pipefail
APP="$1"
SERVICE="$2"
BACKUP="$3"
LIST="$4"
cd "$APP"
while IFS= read -r f; do rm -f "$f"; done < "$LIST"
tar -xzf "$BACKUP" -C "$APP"
npm run build
systemctl restart "$SERVICE"
REMOTE
  exit "$rc"
}
trap rollback ERR

log "rebuild production so statically rendered exam surfaces include new data"
ssh -o BatchMode=yes "$REMOTE_HOST" bash -s -- "$REMOTE_APP" "$REMOTE_SERVICE" <<'REMOTE'
set -Eeuo pipefail
APP="$1"
SERVICE="$2"
cd "$APP"
npm run build
systemctl restart "$SERVICE"
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3000/api/release >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done
echo "service did not become healthy" >&2
exit 1
REMOTE

remote_manifest > "$TMP/remote-after.json"
python3 - "$TMP/local.json" "$TMP/remote-after.json" "$TMP/exams.txt" <<'PY'
import json,sys
local=json.load(open(sys.argv[1],encoding="utf-8"))
remote=json.load(open(sys.argv[2],encoding="utf-8"))
ids={x.strip() for x in open(sys.argv[3],encoding="utf-8") if x.strip()}
lb={b["examId"]:b for b in local["bundles"]}
rb={b["examId"]:b for b in remote["bundles"]}
for exam_id in sorted(ids):
    assert exam_id in rb, f"published bundle missing remotely: {exam_id}"
    assert rb[exam_id]["examSha256"] == lb[exam_id]["examSha256"], exam_id
    la={a["path"]:a["sha256"] for a in lb[exam_id].get("assets",[])}
    ra={a["path"]:a["sha256"] for a in rb[exam_id].get("assets",[])}
    assert la == ra, f"asset hash mismatch: {exam_id}"
print(json.dumps({"verifiedPublishedBundles":len(ids)},ensure_ascii=False))
PY

python3 scripts/smoke_test.py --base "$PUBLIC_URL"
curl -fsS "$PUBLIC_URL/api/release" >/dev/null
curl -fsS "$PUBLIC_URL/" | grep -q "Math Competition Lab"

log "write production data release receipt"
ssh -o BatchMode=yes "$REMOTE_HOST" bash -s -- \
  "$REMOTE_APP" "$STAMP" "$LOCAL_SHA" "$EXAM_COUNT" "$FILE_COUNT" "$REMOTE_BACKUP" <<'REMOTE'
set -Eeuo pipefail
APP="$1"
STAMP="$2"
SHA="$3"
EXAMS="$4"
FILES="$5"
BACKUP="$6"
mkdir -p "$APP/.release/data-promotions"
python3 - "$APP/.release/data-promotions/$STAMP.json" "$STAMP" "$SHA" "$EXAMS" "$FILES" "$BACKUP" <<'PY'
import json,sys,datetime
out,stamp,sha,exams,files,backup=sys.argv[1:]
data={
  "kind":"STUDENT_READY",
  "stamp":stamp,
  "gitSha":sha,
  "bundleCount":int(exams),
  "fileCount":int(files),
  "backup":backup,
  "publishedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
open(out,"w",encoding="utf-8").write(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
PY
REMOTE

trap - ERR
log "PASS: published $EXAM_COUNT STUDENT_READY bundles with rollback backup $REMOTE_BACKUP"
