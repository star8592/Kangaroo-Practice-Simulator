#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/kangaroo-practice-simulator}
PM2_NAME=${PM2_NAME:-kangaroo-practice}
BACKUP_DIR=${BACKUP_DIR:-$APP_DIR/.deploy-backups}

if [ ! -d "$BACKUP_DIR" ]; then
  echo "No deployment backup directory found: $BACKUP_DIR"
  exit 1
fi

LATEST_BACKUP=$(ls -1dt "$BACKUP_DIR"/* 2>/dev/null | head -n 1 || true)

if [ -z "$LATEST_BACKUP" ]; then
  echo "No rollback target found"
  exit 1
fi

cd "$APP_DIR"

if [ -d "$LATEST_BACKUP" ]; then
  echo "Restoring from $LATEST_BACKUP"
  cp -a "$LATEST_BACKUP"/. .
fi

npm ci
npm run build
pm2 restart "$PM2_NAME"

echo "Rollback completed"
