#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_ROOT="${SOURCE_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-root@8.166.137.232}"
PERSIST_ROOT="${PERSIST_ROOT:-/opt/socthink-math}"
REMOTE_SERVICE="${REMOTE_SERVICE:-socthink-math.service}"
RELEASE_ROOT="${RELEASE_ROOT:-/opt/socthink-releases}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"
DATA_BRANCH="${DATA_BRANCH:-release-data/pre-a-grade1-20260923}"
SSH_BIN="${SSH_BIN:-ssh}"
SCP_BIN="${SCP_BIN:-scp}"
DRY_RUN="${DRY_RUN:-0}"

log(){ printf '\n[prebuilt-publish] %s\n' "$*"; }
die(){ echo "[prebuilt-publish] ERROR: $*" >&2; exit 1; }

cd "$SOURCE_ROOT"
log "fetch GitHub code and grade-one release data"
git fetch origin main "$DATA_BRANCH"
TARGET_SHA="$(git rev-parse origin/main)"
VERSION="$(git show "$TARGET_SHA:VERSION" | tr -d '\r\n')"
DATA_REF="origin/$DATA_BRANCH"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/kps-prebuilt-publish.XXXXXX")"
cleanup(){
  python3 - "$TMP" <<'PY'
import shutil,sys
shutil.rmtree(sys.argv[1],ignore_errors=True)
PY
}
trap cleanup EXIT

CLEAN="$TMP/src"
git clone --local --no-hardlinks "$SOURCE_ROOT" "$CLEAN" >/dev/null
git -C "$CLEAN" remote set-url origin https://github.com/star8592/Kangaroo-Practice-Simulator.git
git -C "$CLEAN" checkout --detach "$TARGET_SHA" >/dev/null

# Build gates use local verified data but the immutable runtime artifact must not
# contain private data. The builder removes all traced private/.git content.
mkdir -p "$CLEAN/private" "$CLEAN/public/local-assets/australian-amc" "$CLEAN/public/generated-solutions"
for entry in exams solutions users arithmetic question-bank.json library-status.json translations translation germany-solutions visual-overlays; do
  [ -e "$SOURCE_ROOT/private/$entry" ] && cp -a "$SOURCE_ROOT/private/$entry" "$CLEAN/private/"
done
cp -a "$SOURCE_ROOT/public/local-assets/maa-amc" "$CLEAN/public/local-assets/"
cp -a "$SOURCE_ROOT/public/local-assets/australian-amc/pre-a" "$CLEAN/public/local-assets/australian-amc/"
for dir in "$SOURCE_ROOT"/public/generated-solutions/au-amc-pre-a-s*-q*; do
  [ -d "$dir" ] && cp -a "$dir" "$CLEAN/public/generated-solutions/"
done

log "build immutable runtime locally"
OUT="$TMP/prebuilt"
ROOT="$CLEAN" OUT="$OUT" TARGET_SHA="$TARGET_SHA" VERSION="$VERSION" \
  bash "$CLEAN/ops/release/build_prebuilt_runtime.sh"

DATA_PAYLOAD="$TMP/pre-a-grade1-payload.tar.gz"
DATA_META="$TMP/pre-a-grade1-payload.txt"
git show "$DATA_REF:release-payloads/pre-a-grade1-payload.tar.gz" > "$DATA_PAYLOAD"
git show "$DATA_REF:release-payloads/pre-a-grade1-payload.txt" > "$DATA_META"
DATA_SHA="$(awk '$1=="sha256"{print $2}' "$DATA_META")"
test -n "$DATA_SHA"
echo "$DATA_SHA  $DATA_PAYLOAD" | sha256sum -c -

RUNTIME_PAYLOAD="$OUT/runtime.tar.gz"
RUNTIME_META="$OUT/runtime.txt"
RUNTIME_SHA="$(awk '$1=="sha256"{print $2}' "$RUNTIME_META")"
test -n "$RUNTIME_SHA"
echo "$RUNTIME_SHA  $RUNTIME_PAYLOAD" | sha256sum -c -

if [ "$DRY_RUN" = "1" ]; then
  printf 'PREBUILT_PUBLISH_DRY_RUN=PASS commit=%s runtime_sha=%s data_sha=%s\n'     "$TARGET_SHA" "$RUNTIME_SHA" "$DATA_SHA"
  exit 0
fi

log "preflight production SSH"
"$SSH_BIN" -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" 'echo SSH_OK' | grep -q SSH_OK

REMOTE_TMP="/tmp/kps-prebuilt-$TARGET_SHA"
"$SSH_BIN" "$REMOTE_HOST" "mkdir -p '$REMOTE_TMP'"
log "upload prebuilt runtime and verified grade-one payload"
"$SCP_BIN" "$RUNTIME_PAYLOAD" "$RUNTIME_META" "$DATA_PAYLOAD" "$DATA_META" "$REMOTE_HOST:$REMOTE_TMP/"

log "promote runtime and data without compiling on production"
"$SSH_BIN" "$REMOTE_HOST" bash -s --   "$PERSIST_ROOT" "$REMOTE_SERVICE" "$RELEASE_ROOT" "$TARGET_SHA" "$VERSION" "$REMOTE_TMP" <<'REMOTE'
set -Eeuo pipefail
APP="$1"
SERVICE="$2"
RELEASES="$3"
TARGET_SHA="$4"
VERSION="$5"
REMOTE_TMP="$6"
DATA_CURRENT="$7"
DATA_SHA_EXPECTED="$8"
RUNTIME_TAR="$REMOTE_TMP/runtime.tar.gz"
RUNTIME_META="$REMOTE_TMP/runtime.txt"
DATA_TAR="$REMOTE_TMP/pre-a-grade1-payload.tar.gz"
DATA_META="$REMOTE_TMP/pre-a-grade1-payload.txt"
REL="$RELEASES/$TARGET_SHA"
CURRENT="$RELEASES/current"
DROPIN_DIR="/etc/systemd/system/$SERVICE.d"
DROPIN="$DROPIN_DIR/90-prebuilt-runtime.conf"
DROPIN_BACKUP="/tmp/kps-prebuilt-dropin-$TARGET_SHA.bak"
STAMP="$(date +%Y%m%d-%H%M%S)"
DATA_BACKUP="/opt/socthink-math-backups/pre-a-grade1-prebuilt-$STAMP.tar.gz"
DATA_LIST="/tmp/pre-a-grade1-prebuilt-$STAMP.txt"
DATA_CHANGED=0
STATUS="/tmp/kps-prebuilt-$TARGET_SHA.status"
PREV_CURRENT="$(readlink -f "$CURRENT" 2>/dev/null || true)"
HAD_DROPIN=0
TEST_PID=""

RUNTIME_SHA="$(awk '$1=="sha256"{print $2}' "$RUNTIME_META")"
test -n "$RUNTIME_SHA"
test -n "$DATA_SHA_EXPECTED"
echo "$RUNTIME_SHA  $RUNTIME_TAR" | sha256sum -c -
if [ "$DATA_CURRENT" = "1" ]; then
  DATA_SHA="$DATA_SHA_EXPECTED"
else
  DATA_SHA="$(awk '$1=="sha256"{print $2}' "$DATA_META")"
  test "$DATA_SHA" = "$DATA_SHA_EXPECTED"
  echo "$DATA_SHA  $DATA_TAR" | sha256sum -c -
fi

mkdir -p "$RELEASES" "$DROPIN_DIR"
if [ -f "$DROPIN" ]; then
  cp -a "$DROPIN" "$DROPIN_BACKUP"
  HAD_DROPIN=1
fi

if [ "$DATA_CURRENT" != "1" ]; then
  : > "$DATA_LIST"
  find "$APP/private/exams" -maxdepth 1 -type f -name 'au-amc-pre-a-sample-*.json' -print >> "$DATA_LIST" 2>/dev/null || true
  find "$APP/private/solutions" -maxdepth 1 -type f -name 'au-amc-pre-a-s*-q*.json' -print >> "$DATA_LIST" 2>/dev/null || true
  find "$APP/public/generated-solutions" -maxdepth 1 -mindepth 1 -type d -name 'au-amc-pre-a-s*-q*' -print >> "$DATA_LIST" 2>/dev/null || true
  if [ -d "$APP/public/local-assets/australian-amc/pre-a" ]; then
    printf '%s\n' "$APP/public/local-assets/australian-amc/pre-a" >> "$DATA_LIST"
  fi
  sort -u -o "$DATA_LIST" "$DATA_LIST"
  mkdir -p "$(dirname "$DATA_BACKUP")"
  tar -czf "$DATA_BACKUP" -T "$DATA_LIST"
fi

rollback(){
  rc=$?
  trap - ERR
  [ -n "$TEST_PID" ] && kill "$TEST_PID" >/dev/null 2>&1 || true
  if [ "$DATA_CHANGED" = "1" ] && [ -f "$DATA_BACKUP" ]; then
    tar -xzf "$DATA_BACKUP" -C / || true
  fi
  if [ -n "$PREV_CURRENT" ]; then
    ln -sfn "$PREV_CURRENT" "$RELEASES/current.rollback"
    mv -Tf "$RELEASES/current.rollback" "$CURRENT" || true
  fi
  if [ "$HAD_DROPIN" = "1" ]; then
    cp -a "$DROPIN_BACKUP" "$DROPIN" || true
  else
    rm -f "$DROPIN" || true
  fi
  systemctl daemon-reload || true
  systemctl restart "$SERVICE" || true
  printf 'ROLLBACK rc=%s backup=%s\n' "$rc" "$DATA_BACKUP" > "$STATUS"
  exit "$rc"
}
trap rollback ERR

python3 - "$REL" <<'PY'
import shutil,sys
shutil.rmtree(sys.argv[1],ignore_errors=True)
PY
mkdir -p "$REL"
tar -xzf "$RUNTIME_TAR" -C "$REL"
test -f "$REL/server.js"
test ! -e "$REL/private"

if [ "$DATA_CURRENT" != "1" ]; then
  DATA_CHANGED=1
  tar -xzf "$DATA_TAR" -C "$APP"
fi

ln -s "$APP/private" "$REL/private"
mkdir -p "$REL/public"
ln -s "$APP/public/local-assets" "$REL/public/local-assets"
ln -s "$APP/public/generated-solutions" "$REL/public/generated-solutions"

cd "$REL"
python3 scripts/test_pre_a_grade1_ready.py

NODE_BIN="$(command -v node)"
TEST_PORT=3097
PORT="$TEST_PORT" HOSTNAME=127.0.0.1 "$NODE_BIN" server.js >"/tmp/kps-prebuilt-test-$TARGET_SHA.log" 2>&1 &
TEST_PID=$!
READY=0
for _ in $(seq 1 45); do
  if ! kill -0 "$TEST_PID" >/dev/null 2>&1; then
    cat "/tmp/kps-prebuilt-test-$TARGET_SHA.log" >&2 || true
    exit 21
  fi
  if curl -fsS "http://127.0.0.1:$TEST_PORT/api/release" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
test "$READY" = "1"
python3 scripts/smoke_prebuilt_runtime.py --base "http://127.0.0.1:$TEST_PORT" --data-root "$REL"
kill "$TEST_PID"
wait "$TEST_PID" || true
TEST_PID=""

cat > "$DROPIN" <<EOF
[Service]
WorkingDirectory=$CURRENT
ExecStart=
ExecStart=$NODE_BIN $CURRENT/server.js
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
EOF

ln -sfn "$REL" "$RELEASES/current.next"
mv -Tf "$RELEASES/current.next" "$CURRENT"
systemctl daemon-reload
systemctl restart "$SERVICE"

READY=0
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3000/api/release >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
test "$READY" = "1"
python3 scripts/smoke_prebuilt_runtime.py --base http://127.0.0.1:3000 --data-root "$REL"
python3 - "$TARGET_SHA" <<'PY'
import json,sys,urllib.request
expected=sys.argv[1]
with urllib.request.urlopen("http://127.0.0.1:3000/api/release") as r:
    data=json.load(r)
assert data.get("deployedSha")==expected,(data,expected)
assert data.get("gitSha")==expected,(data,expected)
print("LOCAL_PREBUILT_RELEASE=PASS",expected)
PY
mkdir -p "$APP/.release/data-promotions"
printf '%s\n' "$DATA_SHA" > "$APP/.release/data-promotions/pre-a-grade1-prebuilt.sha256"
printf 'PASS runtime=%s data=%s backup=%s\n' "$RUNTIME_SHA" "$DATA_SHA" "$DATA_BACKUP" > "$STATUS"
trap - ERR
cat "$STATUS"
REMOTE

log "verify public release and grade-one narration"
PUBLIC_JSON="$(curl -fsS "$PUBLIC_URL/api/release")"
python3 - "$PUBLIC_JSON" "$TARGET_SHA" "$VERSION" <<'PY'
import json,sys
data=json.loads(sys.argv[1]); sha=sys.argv[2]; version=sys.argv[3]
assert data.get("ok") is True,data
assert data.get("deployedSha")==sha,(data,sha)
assert data.get("gitSha")==sha,(data,sha)
assert data.get("version")==version,(data,version)
print("PUBLIC_PREBUILT_RELEASE=PASS",version,sha)
PY

LOCAL_MP3="$CLEAN/public/grade1-narration/v1/au-amc-pre-a-s1-q01/scene-01.mp3"
PUBLIC_MP3="$TMP/public-q01.mp3"
curl -fsS "$PUBLIC_URL/grade1-narration/v1/au-amc-pre-a-s1-q01/scene-01.mp3?sha=$TARGET_SHA" -o "$PUBLIC_MP3"
test "$(sha256sum "$LOCAL_MP3" | awk '{print $1}')" = "$(sha256sum "$PUBLIC_MP3" | awk '{print $1}')"

printf 'PREBUILT_PRODUCTION_RELEASE=PASS commit=%s runtime_sha=%s data_sha=%s\n'   "$TARGET_SHA" "$RUNTIME_SHA" "$DATA_SHA"