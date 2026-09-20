#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
BRANCH="${BRANCH:-main}"
REMOTE_HOST="${REMOTE_HOST:-root@socthink.cn}"
REMOTE_APP="${REMOTE_APP:-/opt/socthink-math}"
REMOTE_SERVICE="${REMOTE_SERVICE:-socthink-math.service}"
PUBLIC_URL="${PUBLIC_URL:-https://socthink.cn}"
LOCAL_TEST_PORT="${LOCAL_TEST_PORT:-3037}"

log() { printf '\n[publish] %s\n' "$*"; }
die() { echo "[publish] ERROR: $*" >&2; exit 1; }

cd "$ROOT"

log "fetch GitHub source of truth"
git fetch origin "$BRANCH"
TARGET_SHA="$(git rev-parse "origin/$BRANCH")"
VERSION="$(git show "origin/$BRANCH:VERSION" 2>/dev/null | tr -d '\r\n' || true)"
[ -n "$VERSION" ] || VERSION="dev"

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "tracked local changes detected; GitHub must remain the only code source"
fi

CURRENT_BRANCH="$(git branch --show-current)"
[ "$CURRENT_BRANCH" = "$BRANCH" ] || die "local checkout must be $BRANCH (currently $CURRENT_BRANCH)"

git merge --ff-only "origin/$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
[ "$LOCAL_SHA" = "$TARGET_SHA" ] || die "local HEAD does not match origin/$BRANCH"

log "local production build for $VERSION @ $TARGET_SHA"
npm ci
npm run build

log "local isolated smoke test"
LOCAL_LOG="/tmp/math-competition-release-${TARGET_SHA:0:12}.log"
npm start -- -p "$LOCAL_TEST_PORT" >"$LOCAL_LOG" 2>&1 &
LOCAL_PID=$!
cleanup_local() {
  kill "$LOCAL_PID" >/dev/null 2>&1 || true
  wait "$LOCAL_PID" >/dev/null 2>&1 || true
}
trap cleanup_local EXIT

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$LOCAL_TEST_PORT/" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$LOCAL_TEST_PORT/" >/dev/null || {
  cat "$LOCAL_LOG" >&2
  die "local release candidate did not start"
}
python3 scripts/smoke_test.py --base "http://127.0.0.1:$LOCAL_TEST_PORT"
cleanup_local
trap - EXIT

log "deploy exact GitHub commit to $REMOTE_HOST"
ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" bash -s -- \
  "$REMOTE_APP" "$REMOTE_SERVICE" "$TARGET_SHA" "$BRANCH" "$VERSION" <<'REMOTE'
set -Eeuo pipefail
APP="$1"
SERVICE="$2"
TARGET_SHA="$3"
BRANCH="$4"
VERSION="$5"
REPO_URL="https://github.com/star8592/Kangaroo-Practice-Simulator.git"
BACKUP_ROOT="/opt/socthink-math-backups"
LEGACY_BACKUP=""
PREV_SHA=""

log() { printf '\n[remote-deploy] %s\n' "$*"; }

rollback() {
  rc=$?
  trap - ERR
  echo "[remote-deploy] deployment failed (exit $rc), attempting rollback" >&2
  if [ -n "$PREV_SHA" ] && [ -d "$APP/.git" ]; then
    cd "$APP"
    git reset --hard "$PREV_SHA" || true
    npm ci || true
    npm run build || true
    systemctl restart "$SERVICE" || true
    echo "[remote-deploy] rolled back to $PREV_SHA" >&2
  elif [ -n "$LEGACY_BACKUP" ] && [ -f "$LEGACY_BACKUP" ]; then
    cd "$APP"
    if [ -d .git ]; then
      git ls-files -z | xargs -0 -r rm -f || true
    fi
    tar -xzf "$LEGACY_BACKUP" -C "$APP" || true
    npm ci || true
    npm run build || true
    systemctl restart "$SERVICE" || true
    echo "[remote-deploy] restored legacy backup $LEGACY_BACKUP" >&2
  fi
  exit "$rc"
}
trap rollback ERR

command -v git >/dev/null
command -v npm >/dev/null
command -v curl >/dev/null
[ -d "$APP" ]

git config --global --add safe.directory "$APP" || true
cd "$APP"

if [ ! -d .git ]; then
  log "bootstrap Git metadata without touching runtime data"
  mkdir -p "$BACKUP_ROOT"
  LEGACY_BACKUP="$BACKUP_ROOT/legacy-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar \
    --exclude='./private' \
    --exclude='./public' \
    --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./.git' \
    -czf "$LEGACY_BACKUP" .
  git init
  git remote add origin "$REPO_URL"
else
  PREV_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
  git remote set-url origin "$REPO_URL"
fi

log "fetch exact GitHub commit"
git fetch --prune origin "$BRANCH"
git cat-file -e "$TARGET_SHA^{commit}"
git reset --hard "$TARGET_SHA"

# Never run git clean here. private/, public/local-assets/, generated assets,
# user data and other runtime files are intentionally preserved.
mkdir -p .release
printf '%s\n' "$TARGET_SHA" > .release/deployed_sha
printf '%s\n' "$VERSION" > .release/deployed_version
printf '%s\n' "$(date -Iseconds)" > .release/deployed_at

log "install and build production"
npm ci
npm run build

log "restart $SERVICE"
systemctl restart "$SERVICE"

for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3000/api/release >/dev/null 2>&1; then break; fi
  sleep 1
done

log "remote smoke test"
curl -fsS http://127.0.0.1:3000/api/release
echo
python3 scripts/smoke_test.py --base http://127.0.0.1:3000

REMOTE_HEAD="$(git rev-parse HEAD)"
[ "$REMOTE_HEAD" = "$TARGET_SHA" ]
trap - ERR
log "remote deployment PASS: $VERSION @ $TARGET_SHA"
REMOTE

log "public verification"
PUBLIC_JSON="$(curl -fsS "$PUBLIC_URL/api/release")"
printf '%s\n' "$PUBLIC_JSON"
python3 - "$PUBLIC_JSON" "$TARGET_SHA" "$VERSION" <<'PY'
import json,sys
data=json.loads(sys.argv[1])
expected_sha=sys.argv[2]
expected_version=sys.argv[3]
assert data.get("ok") is True, data
assert data.get("deployedSha")==expected_sha, (data, expected_sha)
assert data.get("version")==expected_version, (data, expected_version)
print("PUBLIC_RELEASE=PASS", expected_version, expected_sha)
PY

curl -fsS "$PUBLIC_URL/" | grep -q "Math Competition Lab"

log "SUCCESS: $PUBLIC_URL is running $VERSION @ $TARGET_SHA"
