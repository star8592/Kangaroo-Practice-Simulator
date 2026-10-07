#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/ops/release/install_wechat_miniapp_auth.sh"

test -f "$SCRIPT"
grep -q 'WECHAT_MINIAPP_APPID' "$SCRIPT"
grep -q 'WECHAT_MINIAPP_SECRET' "$SCRIPT"
grep -q '/etc/socthink-math-miniapp.env' "$SCRIPT"
grep -q 'chmod 0600' "$SCRIPT"
grep -q '31-miniapp-auth.conf' "$SCRIPT"
grep -q 'systemctl daemon-reload' "$SCRIPT"
grep -q 'systemctl restart socthink-math.service' "$SCRIPT"
grep -q '/api/auth/miniapp/wechat' "$SCRIPT"

echo "WECHAT_MINIAPP_AUTH_INSTALL_CONTRACT=PASS"
