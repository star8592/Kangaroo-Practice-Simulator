#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-root@socthink.cn}"
REMOTE_APP="${REMOTE_APP:-/opt/socthink-math}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"
DRY_RUN="${DRY_RUN:-0}"

cd "$ROOT"
TMP="$(mktemp -d /tmp/source-promotion.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

log(){ printf '\n[source-promotion] %s\n' "$*"; }
die(){ echo "[source-promotion] ERROR: $*" >&2; exit 1; }

git diff --quiet && git diff --cached --quiet || die "tracked working tree must be clean"
LOCAL_SHA="$(git rev-parse HEAD)"
ORIGIN_SHA="$(git rev-parse origin/main)"
[[ "$LOCAL_SHA" == "$ORIGIN_SHA" ]] || die "local HEAD is not origin/main"

PUBLIC_JSON="$(curl -fsS "$PUBLIC_URL/api/release")"
DEPLOYED_SHA="$(python3 - "$PUBLIC_JSON" <<'PY'
import json,sys
print(json.loads(sys.argv[1]).get("deployedSha",""))
PY
)"
[[ "$DEPLOYED_SHA" == "$LOCAL_SHA" ]] || die "production code must match local HEAD before data promotion"

profile_ids(){
  node_modules/.bin/tsx -e 'import {listExamProfiles} from "./src/lib/question-bank"; console.log(JSON.stringify(listExamProfiles().map(p=>p.id).sort()))'
}
remote_profile_ids(){
  ssh -o BatchMode=yes "$REMOTE_HOST" "cd '$REMOTE_APP' && node_modules/.bin/tsx -e 'import {listExamProfiles} from \"./src/lib/question-bank\"; console.log(JSON.stringify(listExamProfiles().map(p=>p.id).sort()))'"
}

log "capture student-ready surface before source promotion"
profile_ids > "$TMP/local-before.json"
remote_profile_ids > "$TMP/remote-before.json"

log "apply only SOURCE_VERIFIED canonical source records locally"
python3 scripts/apply_verified_sources_to_exams.py --apply >/dev/null
profile_ids > "$TMP/local-after.json"

cmp -s "$TMP/local-before.json" "$TMP/local-after.json" || die "local student-ready exam surface changed; refusing data sync"
cmp -s "$TMP/local-after.json" "$TMP/remote-before.json" || die "production/local student-ready surfaces differ; refusing data sync"

python3 - <<'PY' > "$TMP/files.txt"
import json
r=json.load(open("private/source-digitization/source-promotion-report.json"))
for p in r["changedFiles"]:
    print(p)
PY

COUNT="$(wc -l < "$TMP/files.txt" | tr -d ' ')"
[[ "$COUNT" -gt 0 ]] || { log "nothing to sync"; exit 0; }
log "validated $COUNT exam bundles"

if [[ "$DRY_RUN" == "1" ]]; then
  rsync -ani --files-from="$TMP/files.txt" ./ "$REMOTE_HOST:$REMOTE_APP/" | head -100 || true
  log "DRY_RUN complete"
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
scp -q "$TMP/files.txt" "$REMOTE_HOST:/tmp/source-promotion-files.txt"
ssh -o BatchMode=yes "$REMOTE_HOST" "set -euo pipefail; cd '$REMOTE_APP'; mkdir -p /opt/socthink-math-backups; tar -czf '/opt/socthink-math-backups/source-promotion-$STAMP.tar.gz' -T /tmp/source-promotion-files.txt"
log "remote backup created: /opt/socthink-math-backups/source-promotion-$STAMP.tar.gz"

rsync -a --files-from="$TMP/files.txt" ./ "$REMOTE_HOST:$REMOTE_APP/"

sha256sum $(cat "$TMP/files.txt") | sort -k2 > "$TMP/local.sha256"
ssh -o BatchMode=yes "$REMOTE_HOST" "cd '$REMOTE_APP'; sha256sum $(cat /tmp/source-promotion-files.txt) | sort -k2" > "$TMP/remote.sha256"
diff -u "$TMP/local.sha256" "$TMP/remote.sha256" >/dev/null || die "remote file hash mismatch"

remote_profile_ids > "$TMP/remote-after.json"
cmp -s "$TMP/remote-before.json" "$TMP/remote-after.json" || die "student-ready exam surface changed after sync"

curl -fsS "$PUBLIC_URL/api/release" >/dev/null
curl -fsS "$PUBLIC_URL/" >/dev/null

log "PASS: $COUNT canonical exam bundles synced; student-ready surface unchanged"
