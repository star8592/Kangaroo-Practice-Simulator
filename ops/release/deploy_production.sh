#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/kangaroo-practice}
BRANCH=${BRANCH:-main}

log(){ echo "[deploy] $*"; }

log "checking application directory"
cd "$APP_DIR"

log "fetch latest code"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

log "install dependencies"
npm ci

log "build application"
npm run build

if [ -f scripts/smoke_test.py ]; then
  log "run smoke test"
  python3 scripts/smoke_test.py
fi

log "restart service"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all
else
  echo "pm2 not found, skip restart"
fi

log "deployment finished"
