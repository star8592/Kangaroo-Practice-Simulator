#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-root@socthink.cn}"
REMOTE_APP="${REMOTE_APP:-/opt/socthink-math}"
REMOTE_SERVICE="${REMOTE_SERVICE:-socthink-math.service}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"
COMPETITION_ID="${COMPETITION_ID:-}"
DRY_RUN="${DRY_RUN:-0}"

cd "$ROOT"
TMP="$(mktemp -d /tmp/training-ready-promotion.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

log(){ printf '\n[training-ready-promotion] %s\n' "$*"; }
die(){ echo "[training-ready-promotion] ERROR: $*" >&2; exit 1; }

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "tracked working tree must be clean"
fi

git fetch -q origin main
LOCAL_SHA="$(git rev-parse HEAD)"
ORIGIN_SHA="$(git rev-parse origin/main)"
[[ "$LOCAL_SHA" == "$ORIGIN_SHA" ]] || die "local HEAD is not origin/main"

PUBLIC_JSON="$(curl -fsS "$PUBLIC_URL/api/release")"
DEPLOYED_SHA="$(python3 - "$PUBLIC_JSON" <<'PY'
import json,sys
print(json.loads(sys.argv[1]).get("deployedSha", ""))
PY
)"
[[ "$DEPLOYED_SHA" == "$LOCAL_SHA" ]] || die "production code must match local HEAD before data promotion"

manifest(){
  COMPETITION_ID="$COMPETITION_ID" node_modules/.bin/tsx scripts/build_training_ready_manifest.ts
}
remote_manifest(){
  ssh -o BatchMode=yes "$REMOTE_HOST" \
    "cd '$REMOTE_APP' && COMPETITION_ID='$COMPETITION_ID' node_modules/.bin/tsx scripts/build_training_ready_manifest.ts"
}

log "compare local and production private-training manifests${COMPETITION_ID:+ for $COMPETITION_ID}"
manifest > "$TMP/local.json"
remote_manifest > "$TMP/remote-before.json"

python3 - "$TMP/local.json" "$TMP/remote-before.json" "$TMP/files.txt" "$TMP/exams.txt" <<'PY'
import json,sys
local=json.load(open(sys.argv[1],encoding="utf-8"))
remote=json.load(open(sys.argv[2],encoding="utf-8"))
rb={b["examId"]:b for b in remote.get("bundles",[])}
files=set(); exams=[]
for b in local.get("bundles",[]):
    old=rb.get(b["examId"])
    old_assets={a["path"]:a["sha256"] for a in (old or {}).get("assets",[])}
    changed=(old is None or old.get("examSha256") != b["examSha256"] or any(old_assets.get(a["path"]) != a["sha256"] for a in b.get("assets",[])))
    if changed:
        files.add(b["examPath"])
        files.update(a["path"] for a in b.get("assets",[]))
        exams.append(b["examId"])
open(sys.argv[3],"w",encoding="utf-8").write("".join(x+"\n" for x in sorted(files)))
open(sys.argv[4],"w",encoding="utf-8").write("".join(x+"\n" for x in sorted(exams)))
print(json.dumps({
  "localBundles":local.get("bundleCount",0),
  "productionBundles":remote.get("bundleCount",0),
  "changedBundles":len(exams),
  "filesToSync":len(files),
},ensure_ascii=False))
PY

FILE_COUNT="$(wc -l < "$TMP/files.txt" | tr -d ' ')"
EXAM_COUNT="$(wc -l < "$TMP/exams.txt" | tr -d ' ')"
if [[ "$FILE_COUNT" -eq 0 ]]; then
  log "nothing to publish"
  exit 0
fi

log "$EXAM_COUNT bundles / $FILE_COUNT files require synchronization"
if [[ "$DRY_RUN" == "1" ]]; then
  rsync -ani --files-from="$TMP/files.txt" ./ "$REMOTE_HOST:$REMOTE_APP/" | head -300 || true
  log "DRY_RUN complete"
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
REMOTE_LIST="/tmp/training-ready-files-$STAMP.txt"
REMOTE_BACKUP="/opt/socthink-math-backups/training-ready-$STAMP.tar.gz"
scp -q "$TMP/files.txt" "$REMOTE_HOST:$REMOTE_LIST"

log "backup touched production files"
ssh -o BatchMode=yes "$REMOTE_HOST" bash -s -- "$REMOTE_APP" "$REMOTE_BACKUP" "$REMOTE_LIST" <<'REMOTE'
set -Eeuo pipefail
APP="$1"; BACKUP="$2"; LIST="$3"; EXISTING="${LIST}.existing"
cd "$APP"; : > "$EXISTING"
while IFS= read -r f; do [[ -f "$f" ]] && printf '%s\n' "$f" >> "$EXISTING"; done < "$LIST"
mkdir -p "$(dirname "$BACKUP")"
if [[ -s "$EXISTING" ]]; then tar -czf "$BACKUP" -T "$EXISTING"; else tar -czf "$BACKUP" --files-from=/dev/null; fi
REMOTE

rollback(){
  rc=$?; trap - ERR
  echo "[training-ready-promotion] failed; restoring backup" >&2
  ssh -o BatchMode=yes "$REMOTE_HOST" bash -s -- "$REMOTE_APP" "$REMOTE_SERVICE" "$REMOTE_BACKUP" "$REMOTE_LIST" <<'REMOTE' || true
set -Eeuo pipefail
APP="$1"; SERVICE="$2"; BACKUP="$3"; LIST="$4"
cd "$APP"
while IFS= read -r f; do rm -f "$f"; done < "$LIST"
tar -xzf "$BACKUP" -C "$APP"
systemctl restart "$SERVICE"
REMOTE
  exit "$rc"
}
trap rollback ERR

log "sync complete private-training bundles and assets"
rsync -a --files-from="$TMP/files.txt" ./ "$REMOTE_HOST:$REMOTE_APP/"
sha256sum $(cat "$TMP/files.txt") | sort -k2 > "$TMP/local.sha256"
ssh -o BatchMode=yes "$REMOTE_HOST" "cd '$REMOTE_APP'; sha256sum \$(cat '$REMOTE_LIST') | sort -k2" > "$TMP/remote.sha256"
diff -u "$TMP/local.sha256" "$TMP/remote.sha256" >/dev/null || die "remote file hash mismatch"

ssh -o BatchMode=yes "$REMOTE_HOST" "systemctl restart '$REMOTE_SERVICE'"
for _ in $(seq 1 60); do
  curl -fsS "$PUBLIC_URL/api/release" >/dev/null 2>&1 && break
  sleep 1
done

remote_manifest > "$TMP/remote-after.json"
python3 - "$TMP/local.json" "$TMP/remote-after.json" "$TMP/exams.txt" <<'PY'
import json,sys
local=json.load(open(sys.argv[1],encoding="utf-8")); remote=json.load(open(sys.argv[2],encoding="utf-8"))
ids={x.strip() for x in open(sys.argv[3],encoding="utf-8") if x.strip()}
lb={b["examId"]:b for b in local.get("bundles",[])}; rb={b["examId"]:b for b in remote.get("bundles",[])}
for eid in ids:
    assert eid in rb, f"missing remote bundle: {eid}"
    assert rb[eid]["examSha256"] == lb[eid]["examSha256"], f"exam hash mismatch: {eid}"
    assert {a["path"]:a["sha256"] for a in rb[eid].get("assets",[])} == {a["path"]:a["sha256"] for a in lb[eid].get("assets",[])}, f"asset hash mismatch: {eid}"
print(json.dumps({"verifiedPublishedBundles":len(ids),"remoteBundleCount":remote.get("bundleCount",0)},ensure_ascii=False))
PY

log "write data promotion receipt"
ssh -o BatchMode=yes "$REMOTE_HOST" bash -s -- "$REMOTE_APP" "$STAMP" "$LOCAL_SHA" "$EXAM_COUNT" "$FILE_COUNT" "$REMOTE_BACKUP" "$COMPETITION_ID" <<'REMOTE'
set -Eeuo pipefail
APP="$1"; STAMP="$2"; SHA="$3"; EXAMS="$4"; FILES="$5"; BACKUP="$6"; COMP="$7"
mkdir -p "$APP/.release/data-promotions"
python3 - "$APP/.release/data-promotions/training-$STAMP.json" "$STAMP" "$SHA" "$EXAMS" "$FILES" "$BACKUP" "$COMP" <<'PY'
import datetime,json,sys
out,stamp,sha,exams,files,backup,comp=sys.argv[1:]
open(out,"w",encoding="utf-8").write(json.dumps({
  "kind":"PRIVATE_TRAINING_READY","stamp":stamp,"gitSha":sha,"competitionId":comp or None,
  "bundleCount":int(exams),"fileCount":int(files),"backup":backup,
  "publishedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
},ensure_ascii=False,indent=2)+"\n")
PY
REMOTE

trap - ERR
log "PASS: published $EXAM_COUNT private-training bundles"
