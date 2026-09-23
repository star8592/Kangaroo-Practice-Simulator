#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_ROOT="${SOURCE_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-root@socthink.cn}"
REMOTE_APP="${REMOTE_APP:-/opt/socthink-math}"
REMOTE_SERVICE="${REMOTE_SERVICE:-socthink-math.service}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"

log(){ printf '\n[grade1-hotfix] %s\n' "$*"; }
die(){ echo "[grade1-hotfix] ERROR: $*" >&2; exit 1; }

cd "$SOURCE_ROOT"

log "fetch current GitHub main"
git fetch origin main
TARGET_SHA="$(git rev-parse origin/main)"
LOCAL_HEAD="$(git rev-parse HEAD)"
[ "$LOCAL_HEAD" = "$TARGET_SHA" ] || die "local HEAD must match origin/main before release"
VERSION="$(git show "$TARGET_SHA:VERSION" | tr -d '\r\n')"

log "verify grade-one source payload"
python3 scripts/test_pre_a_grade1_ready.py
QUESTION_COUNT="$(find private/solutions -maxdepth 1 -type f -name 'au-amc-pre-a-s*-q*.json' | wc -l)"
AUDIO_COUNT="$(find public/generated-solutions -type f -path '*/au-amc-pre-a-s*-q*/scene-*.wav' | wc -l)"
[ "$QUESTION_COUNT" -eq 50 ] || die "expected 50 grade-one solution JSON files, got $QUESTION_COUNT"
[ "$AUDIO_COUNT" -eq 150 ] || die "expected 150 grade-one narration WAV files, got $AUDIO_COUNT"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/kps-grade1-release.XXXXXX")"
cleanup(){
  python3 - "$TMP" <<'PY2'
import shutil,sys
shutil.rmtree(sys.argv[1], ignore_errors=True)
PY2
}
trap cleanup EXIT

RELEASE_ROOT="$TMP/repo"
PAYLOAD="$TMP/grade1-solution-data.tar.gz"
FILELIST="$TMP/grade1-files.txt"

log "create clean committed release checkout"
git clone --local --no-hardlinks "$SOURCE_ROOT" "$RELEASE_ROOT" >/dev/null
git -C "$RELEASE_ROOT" remote set-url origin https://github.com/star8592/Kangaroo-Practice-Simulator.git
git -C "$RELEASE_ROOT" checkout main >/dev/null
git -C "$RELEASE_ROOT" reset --hard "$TARGET_SHA" >/dev/null

# Production build checks need a subset of the local data corpus. Copy only the
# validated build-time dataset so tests are isolated from live local sessions
# and we do not duplicate the multi-gigabyte extraction/archive corpus.
mkdir -p "$RELEASE_ROOT/private" "$RELEASE_ROOT/public/local-assets/australian-amc" "$RELEASE_ROOT/public/generated-solutions"
for entry in exams solutions users arithmetic question-bank.json library-status.json translations translation germany-solutions visual-overlays; do
  [ -e "$SOURCE_ROOT/private/$entry" ] && cp -a "$SOURCE_ROOT/private/$entry" "$RELEASE_ROOT/private/"
done
cp -a "$SOURCE_ROOT/public/local-assets/maa-amc" "$RELEASE_ROOT/public/local-assets/"
cp -a "$SOURCE_ROOT/public/local-assets/australian-amc/pre-a" "$RELEASE_ROOT/public/local-assets/australian-amc/"
for dir in "$SOURCE_ROOT"/public/generated-solutions/au-amc-pre-a-s*-q*; do
  [ -d "$dir" ] && cp -a "$dir" "$RELEASE_ROOT/public/generated-solutions/"
done

log "preflight workstation passwordless SSH"
ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" 'echo SSH_OK' | grep -q SSH_OK

log "deploy exact GitHub commit through the standard release path"
ROOT="$RELEASE_ROOT" REMOTE_HOST="$REMOTE_HOST" REMOTE_APP="$REMOTE_APP" REMOTE_SERVICE="$REMOTE_SERVICE" PUBLIC_URL="$PUBLIC_URL" bash "$RELEASE_ROOT/ops/release/publish_socthink.sh"

log "build grade-one data/audio payload"
find private/solutions -maxdepth 1 -type f -name 'au-amc-pre-a-s*-q*.json' -print | sort > "$FILELIST"
find public/generated-solutions -maxdepth 1 -mindepth 1 -type d -name 'au-amc-pre-a-s*-q*' -print | sort >> "$FILELIST"
tar -czf "$PAYLOAD" -T "$FILELIST"
LOCAL_AUDIO_SHA="$(sha256sum public/generated-solutions/au-amc-pre-a-s1-q01/scene-01.wav | awk '{print $1}')"

REMOTE_PAYLOAD="/tmp/kps-grade1-solution-${TARGET_SHA}.tar.gz"
log "upload grade-one data/audio payload"
scp -q "$PAYLOAD" "$REMOTE_HOST:$REMOTE_PAYLOAD"

log "promote payload with backup and rollback"
ssh -o BatchMode=yes "$REMOTE_HOST" bash -s --   "$REMOTE_APP" "$REMOTE_SERVICE" "$REMOTE_PAYLOAD" "$TARGET_SHA" <<'REMOTE'
set -Eeuo pipefail
APP="$1"
SERVICE="$2"
PAYLOAD="$3"
TARGET_SHA="$4"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/opt/socthink-math-backups/grade1-solution-$STAMP.tar.gz"
LIST="/tmp/grade1-solution-backup-$STAMP.txt"

cd "$APP"
test "$(git rev-parse HEAD)" = "$TARGET_SHA"
mkdir -p "$(dirname "$BACKUP")"
: > "$LIST"
find private/solutions -maxdepth 1 -type f -name 'au-amc-pre-a-s*-q*.json' -print >> "$LIST" 2>/dev/null || true
find public/generated-solutions -maxdepth 1 -mindepth 1 -type d -name 'au-amc-pre-a-s*-q*' -print >> "$LIST" 2>/dev/null || true
sort -u -o "$LIST" "$LIST"
if [ -s "$LIST" ]; then
  tar -czf "$BACKUP" -T "$LIST"
else
  tar -czf "$BACKUP" --files-from=/dev/null
fi

rollback(){
  rc=$?
  trap - ERR
  echo "[grade1-hotfix] data promotion failed; restoring $BACKUP" >&2
  rm -f private/solutions/au-amc-pre-a-s*-q*.json || true
  rm -rf public/generated-solutions/au-amc-pre-a-s*-q* || true
  tar -xzf "$BACKUP" -C "$APP" || true
  systemctl restart "$SERVICE" || true
  exit "$rc"
}
trap rollback ERR

tar -xzf "$PAYLOAD" -C "$APP"
python3 scripts/test_pre_a_grade1_ready.py
systemctl restart "$SERVICE"
for _ in $(seq 1 60); do
  curl -fsS http://127.0.0.1:3000/api/release >/dev/null 2>&1 && break
  sleep 1
done
python3 scripts/smoke_test.py --base http://127.0.0.1:3000
test "$(git rev-parse HEAD)" = "$TARGET_SHA"
rm -f "$PAYLOAD"
trap - ERR
printf 'GRADE1_DATA_PROMOTION=PASS backup=%s\n' "$BACKUP"
REMOTE

log "verify public code receipt"
PUBLIC_JSON="$(curl -fsS "$PUBLIC_URL/api/release")"
python3 - "$PUBLIC_JSON" "$TARGET_SHA" "$VERSION" <<'PY'
import json,sys
data=json.loads(sys.argv[1])
sha=sys.argv[2]
version=sys.argv[3]
assert data.get("ok") is True, data
assert data.get("deployedSha")==sha, (data,sha)
assert data.get("gitSha")==sha, (data,sha)
assert data.get("version")==version, (data,version)
print("PUBLIC_RELEASE=PASS",version,sha)
PY

log "verify public narration bytes"
PUBLIC_AUDIO="$TMP/public-scene-01.wav"
curl -fsS "$PUBLIC_URL/generated-solutions/au-amc-pre-a-s1-q01/scene-01.wav?sha=$TARGET_SHA" -o "$PUBLIC_AUDIO"
PUBLIC_AUDIO_SHA="$(sha256sum "$PUBLIC_AUDIO" | awk '{print $1}')"
[ "$PUBLIC_AUDIO_SHA" = "$LOCAL_AUDIO_SHA" ] || die "public narration hash does not match local warm narration"

log "SUCCESS: continuous playback + kangaroo teacher + warm narration are live"
printf 'GRADE1_HOTFIX_PUBLIC=PASS sha=%s audio_sha=%s\n' "$TARGET_SHA" "$PUBLIC_AUDIO_SHA"