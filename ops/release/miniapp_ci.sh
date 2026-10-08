#!/usr/bin/env bash
set -Eeuo pipefail
MODE="${1:-}"
[[ "$MODE" == "preview" || "$MODE" == "upload" ]] || { echo "usage: $0 preview|upload" >&2; exit 2; }

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP="$ROOT/apps/miniapp"
APPID="$(node -e "const x=require('$APP/project.config.json'); process.stdout.write(String(x.appid||''))")"
[[ "$APPID" =~ ^wx[A-Za-z0-9]{16}$ ]] || { echo "MINIAPP_CI=FAIL reason=invalid_appid" >&2; exit 2; }

KEY="${MINIAPP_PRIVATE_KEY_PATH:-$HOME/.config/socthink/miniprogram-ci/private.$APPID.key}"
if [[ ! -f "$KEY" ]]; then
  echo "MINIAPP_CI=BLOCKED reason=missing_private_key expected=$KEY" >&2
  exit 3
fi
PERM="$(node -e 'const fs=require("fs"); process.stdout.write(((fs.statSync(process.argv[1]).mode)&0o777).toString(8))' "$KEY")"
[[ "$PERM" == "600" ]] || { echo "MINIAPP_CI=FAIL reason=private_key_permissions mode=$PERM expected=600" >&2; exit 4; }

# Previews can be generated before field-testing, but code uploads require
# real DevTools and physical Android test evidence for this exact Git SHA.
if [[ "$MODE" == "upload" ]]; then
  SOURCE_SHA="$(git -C "$ROOT" rev-parse HEAD)"
  [[ -z "$(git -C "$ROOT" status --porcelain)" ]] || {
    echo "MINIAPP_CI=BLOCKED reason=dirty_checkout" >&2; exit 3;
  }
  REMOTE_SHA="$(git -C "$ROOT" ls-remote origin refs/heads/main | cut -f1)"
  [[ -n "$REMOTE_SHA" && "$SOURCE_SHA" == "$REMOTE_SHA" ]] || {
    echo "MINIAPP_CI=BLOCKED reason=not_exact_remote_main" >&2; exit 3;
  }
  RECEIPT="${MINIAPP_QA_RECEIPT:-$ROOT/.release-tmp/miniapp-qa/release-receipt.json}"
  node "$ROOT/scripts/verify_miniapp_qa_receipt.mjs" "$RECEIPT" "$SOURCE_SHA"
fi

# Never preview or upload an unverified/stale dist tree.
bash "$ROOT/ops/automation/miniapp_quality_gate.sh"

CI_VERSION="2.1.31"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/socthink-miniprogram-ci/$CI_VERSION"
if [[ ! -f "$CACHE/node_modules/miniprogram-ci/package.json" ]]; then
  mkdir -p "$CACHE"
  printf '{"private":true}\n' > "$CACHE/package.json"
  npm --prefix "$CACHE" install --no-audit --no-fund --save-exact "miniprogram-ci@$CI_VERSION"
fi

MODULE_PATH="$(NODE_PATH="$CACHE/node_modules" node -p "require.resolve('miniprogram-ci')")"
NODE_PATH="$CACHE/node_modules" \
MINIAPP_CI_MODULE="$MODULE_PATH" \
MINIAPP_MODE="$MODE" \
MINIAPP_APP_ROOT="$APP" \
MINIAPP_APPID="$APPID" \
MINIAPP_PRIVATE_KEY_PATH="$KEY" \
node "$ROOT/ops/release/miniapp_ci.mjs"
