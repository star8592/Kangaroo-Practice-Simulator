#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP="$ROOT/apps/miniapp"
cd "$ROOT"
npm run test:miniapp-exam-entry
npm run test:miniapp-arithmetic-idempotency
npm run test:exam-submit-recovery
node scripts/test_miniapp_device_gate.mjs
node scripts/test_miniapp_release_gate.mjs
cd "$APP"
[[ -f package-lock.json ]] || { echo 'MINIAPP_QUALITY_GATE=FAIL reason=missing_lockfile' >&2; exit 2; }
npm ci
npm run typecheck
npm run build:weapp
test -f dist/app.json
for page in home arithmetic competitions profile login events exam review diagnostics; do
  test -f "dist/pages/$page/index.js"
  test -f "dist/pages/$page/index.wxml"
done
echo "MINIAPP_QUALITY_GATE=PASS taro=4.3.0 pages=9"
