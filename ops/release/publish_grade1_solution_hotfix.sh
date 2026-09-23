#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_ROOT="${SOURCE_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-root@socthink.cn}"
REMOTE_APP="${REMOTE_APP:-/opt/socthink-math}"
REMOTE_SERVICE="${REMOTE_SERVICE:-socthink-math.service}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"

log(){ printf '\n[grade1-release] %s\n' "$*"; }
die(){ echo "[grade1-release] ERROR: $*" >&2; exit 1; }

cd "$SOURCE_ROOT"

log "fetch current GitHub main"
git fetch origin main
TARGET_SHA="$(git rev-parse origin/main)"
LOCAL_HEAD="$(git rev-parse HEAD)"
[ "$LOCAL_HEAD" = "$TARGET_SHA" ] || die "local HEAD must match origin/main before release"
VERSION="$(git show "$TARGET_SHA:VERSION" | tr -d '\r\n')"

log "verify grade-one solution and bundled narration"
python3 scripts/test_pre_a_grade1_ready.py
python3 scripts/test_grade1_narration_bundle.py
npx tsx scripts/test_grade1_narration_mapping.ts

TMP="$(mktemp -d "${TMPDIR:-/tmp}/kps-grade1-release.XXXXXX")"
cleanup(){
  python3 - "$TMP" <<'PY'
import shutil,sys
shutil.rmtree(sys.argv[1], ignore_errors=True)
PY
}
trap cleanup EXIT

RELEASE_ROOT="$TMP/repo"

log "create clean committed release checkout"
git clone --local --no-hardlinks "$SOURCE_ROOT" "$RELEASE_ROOT" >/dev/null
git -C "$RELEASE_ROOT" remote set-url origin https://github.com/star8592/Kangaroo-Practice-Simulator.git
git -C "$RELEASE_ROOT" checkout main >/dev/null
git -C "$RELEASE_ROOT" reset --hard "$TARGET_SHA" >/dev/null

# Build checks need a small subset of local data that intentionally stays out of
# Git. Copy only the validated build-time corpus; the warm narration MP3 bundle
# itself is tracked and already present in this clean checkout.
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

log "deploy exact GitHub commit through standard production path"
ROOT="$RELEASE_ROOT" \
REMOTE_HOST="$REMOTE_HOST" \
REMOTE_APP="$REMOTE_APP" \
REMOTE_SERVICE="$REMOTE_SERVICE" \
PUBLIC_URL="$PUBLIC_URL" \
bash "$RELEASE_ROOT/ops/release/publish_socthink.sh"

log "verify public warm narration bundle"
LOCAL_MP3="$SOURCE_ROOT/public/grade1-narration/v1/au-amc-pre-a-s1-q01/scene-01.mp3"
PUBLIC_MP3="$TMP/public-scene-01.mp3"
LOCAL_AUDIO_SHA="$(sha256sum "$LOCAL_MP3" | awk '{print $1}')"
curl -fsS "$PUBLIC_URL/grade1-narration/v1/au-amc-pre-a-s1-q01/scene-01.mp3?sha=$TARGET_SHA" -o "$PUBLIC_MP3"
PUBLIC_AUDIO_SHA="$(sha256sum "$PUBLIC_MP3" | awk '{print $1}')"
[ "$PUBLIC_AUDIO_SHA" = "$LOCAL_AUDIO_SHA" ] || die "public narration hash does not match bundled warm narration"

log "verify public release receipt"
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

log "SUCCESS: continuous playback + kangaroo teacher + bundled warm narration are live"
printf 'GRADE1_RELEASE_PUBLIC=PASS sha=%s audio_sha=%s\n' "$TARGET_SHA" "$PUBLIC_AUDIO_SHA"
