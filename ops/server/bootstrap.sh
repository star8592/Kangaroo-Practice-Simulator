#!/usr/bin/env bash
set -euo pipefail

APP_USER=${APP_USER:-deploy}
APP_DIR=${APP_DIR:-/opt/kangaroo-practice-simulator}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 22 LTS before continuing."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

mkdir -p "$APP_DIR"

if command -v nginx >/dev/null 2>&1; then
  echo "nginx detected"
else
  echo "nginx not installed; configure reverse proxy separately"
fi

pm2 startup || true

cat <<EOF
Server bootstrap complete.
Next steps:
1. Clone repository into: $APP_DIR
2. Configure environment variables
3. Run ops/deploy/deploy.sh
4. Configure nginx and HTTPS
EOF
