#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kangaroo-practice-simulator}"
PORT="${PORT:-3000}"

fail() {
  echo "[FAIL] $1"
  exit 1
}

check_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

echo "== Production Preflight Check =="

check_cmd node
check_cmd npm
check_cmd pm2
check_cmd nginx

echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "PM2: $(pm2 -v)"

[ -d "$APP_DIR" ] || fail "app directory missing: $APP_DIR"

free_space=$(df -P "$APP_DIR" | awk 'NR==2 {print $4}')
[ "${free_space:-0}" -gt 1048576 ] || fail "low disk space"

if ss -lnt | grep -q ":${PORT} "; then
  echo "App port ${PORT}: active"
else
  echo "App port ${PORT}: not active yet"
fi

nginx -t

echo "Preflight OK"
