#!/usr/bin/env bash
set -Eeuo pipefail

APP="${SOCTHINK_APP_DIR:-/opt/socthink-math}"
SCRIPT="$APP/ops/release/auto_deploy_server.sh"

if [[ "${EUID}" -ne 0 ]]; then
  echo "installer must run as root" >&2
  exit 2
fi

test -x "$SCRIPT"
install -m 0755 "$SCRIPT" /usr/local/sbin/socthink-auto-deploy
install -m 0644 "$APP/ops/release/systemd/socthink-auto-deploy.service" /etc/systemd/system/socthink-auto-deploy.service
install -m 0644 "$APP/ops/release/systemd/socthink-auto-deploy.timer" /etc/systemd/system/socthink-auto-deploy.timer

systemctl daemon-reload
systemctl enable --now socthink-auto-deploy.timer
systemctl start socthink-auto-deploy.service

systemctl --no-pager --full status socthink-auto-deploy.timer
systemctl --no-pager --full status socthink-auto-deploy.service || true
