#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kangaroo-practice-simulator}"
PM2_NAME="${PM2_NAME:-kangaroo-practice}"

cd "$APP_DIR"

echo "== pull latest code =="
git pull origin main

echo "== install dependencies =="
npm ci

echo "== build production =="
npm run build

echo "== restart service =="
pm2 restart "$PM2_NAME" || pm2 start npm --name "$PM2_NAME" -- start

pm2 save

echo "== deploy finished =="
