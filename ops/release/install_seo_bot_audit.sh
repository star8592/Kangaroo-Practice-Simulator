#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$(id -u)" -eq 0 ]] || { echo 'RUN_AS_ROOT_REQUIRED' >&2; exit 2; }
APP=/opt/socthink-math
DATA="$APP/private/seo"
[[ -d "$DATA" && ! -L "$DATA" ]] || { echo 'MISSING_SEO_DATA_DIR' >&2; exit 3; }
[[ "$(stat -c '%u:%g' "$DATA")" == '1000:1000' ]] || { echo 'SEO_DATA_OWNERSHIP_MISMATCH' >&2; exit 3; }
[[ "$(getent group adm | cut -d: -f3)" == '4' ]] || { echo 'ADM_GID_NOT_4' >&2; exit 3; }
[[ -r /var/log/nginx/access.log ]] || { echo 'NGINX_ACCESS_LOG_UNREADABLE' >&2; exit 3; }
install -m 0644 "$APP/ops/systemd/socthink-seo-bot-audit.service" /etc/systemd/system/socthink-seo-bot-audit.service
install -m 0644 "$APP/ops/systemd/socthink-seo-bot-audit.timer" /etc/systemd/system/socthink-seo-bot-audit.timer
systemctl daemon-reload
systemctl enable --now socthink-seo-bot-audit.timer
echo 'SEO_VERIFIED_BOT_AUDIT_INSTALLED=PASS'
