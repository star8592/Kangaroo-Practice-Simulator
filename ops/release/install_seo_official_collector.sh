#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo "RUN_AS_ROOT_REQUIRED" >&2; exit 2; }
APP="/opt/socthink-math"
CONF="/etc/socthink/seo-official.env"
install -d -m 0700 /etc/socthink
install -d -o master -g master -m 0700 "$APP/private/seo"
if [[ ! -e "$CONF" ]]; then
  (umask 077; : > "$CONF")
fi
chown root:root "$CONF"
chmod 0600 "$CONF"
install -m 0644 "$APP/ops/systemd/socthink-seo-official.service" /etc/systemd/system/socthink-seo-official.service
install -m 0644 "$APP/ops/systemd/socthink-seo-official.timer" /etc/systemd/system/socthink-seo-official.timer
systemctl daemon-reload
systemctl enable --now socthink-seo-official.timer
echo "SEO_COLLECTOR_INSTALLED=PASS"
echo "SEO_CREDENTIALS=CONFIGURE_ONLY_THROUGH_ROOT_0600_FILE"
