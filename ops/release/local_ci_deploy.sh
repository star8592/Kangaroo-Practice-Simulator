#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO="${SOCTHINK_REPO:-star8592/Kangaroo-Practice-Simulator}"
BRANCH="${SOCTHINK_BRANCH:-main}"
TARGET_HOST="${SOCTHINK_TARGET_HOST:-root@8.166.137.232}"
APP="${SOCTHINK_APP_DIR:-/opt/socthink-math}"
PUBLIC_BASE="${SOCTHINK_PUBLIC_BASE:-https://socthink.cn}"
SSH_BIN="${SOCTHINK_SSH_BIN:-ssh}"
TARGET_SHA="${1:-}"

cd "$ROOT"

for command in git npm python3 curl "$SSH_BIN"; do
  command -v "$command" >/dev/null || {
    echo "LOCAL_CI_DEPLOY=ERROR missing_command=$command" >&2
    exit 2
  }
done

git fetch --prune origin "$BRANCH"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
if [[ -z "$TARGET_SHA" ]]; then
  TARGET_SHA="$REMOTE_SHA"
fi
if [[ "$TARGET_SHA" != "$REMOTE_SHA" ]]; then
  echo "LOCAL_CI_DEPLOY=ERROR target_not_origin_main target=$TARGET_SHA origin=$REMOTE_SHA" >&2
  exit 2
fi
git cat-file -e "$TARGET_SHA^{commit}"

WORKTREE="$(mktemp -d /tmp/socthink-local-ci.XXXXXX)"
cleanup() {
  git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git worktree add --detach "$WORKTREE" "$TARGET_SHA"
cd "$WORKTREE"

echo "LOCAL_CI_DEPLOY=VERIFY sha=$TARGET_SHA"
npm ci
npm run verify:public
test "$(git rev-parse HEAD)" = "$TARGET_SHA"

REMOTE_SCRIPT="/tmp/socthink-auto-deploy-$TARGET_SHA"
echo "LOCAL_CI_DEPLOY=RELEASE sha=$TARGET_SHA target=$TARGET_HOST"
"$SSH_BIN" -F /dev/null -o BatchMode=yes "$TARGET_HOST" \
  "cd '$APP' && git remote set-url origin 'https://github.com/$REPO.git' && git fetch --prune origin '$BRANCH' && test \"\$(git rev-parse 'origin/$BRANCH')\" = '$TARGET_SHA' && git show '$TARGET_SHA:ops/release/auto_deploy_server.sh' > '$REMOTE_SCRIPT' && chmod 700 '$REMOTE_SCRIPT' && SOCTHINK_CI_SOURCE=local SOCTHINK_VERIFIED_SHA='$TARGET_SHA' SOCTHINK_REPO='$REPO' SOCTHINK_BRANCH='$BRANCH' SOCTHINK_APP_DIR='$APP' '$REMOTE_SCRIPT'; rc=\$?; rm -f '$REMOTE_SCRIPT'; exit \$rc"

PUBLIC_RELEASE="$(curl -fsS --max-time 15 "$PUBLIC_BASE/api/release")"
RELEASE_PAYLOAD="$PUBLIC_RELEASE" EXPECTED_SHA="$TARGET_SHA" python3 - <<'PY'
import json
import os
payload = json.loads(os.environ["RELEASE_PAYLOAD"])
expected = os.environ["EXPECTED_SHA"]
assert payload.get("ok") is True, payload
assert payload.get("deployedSha") == expected, (payload, expected)
assert payload.get("gitSha") == expected, (payload, expected)
PY

echo "LOCAL_CI_DEPLOY=PASS sha=$TARGET_SHA"
