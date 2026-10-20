#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

: "${WECHAT_OPEN_APPID:?Set WECHAT_OPEN_APPID}"
: "${WECHAT_OPEN_SECRET:?Set WECHAT_OPEN_SECRET}"

WECHAT_WEBSITE_APPID="${WECHAT_WEBSITE_APPID:-}"
WECHAT_WEBSITE_SECRET="${WECHAT_WEBSITE_SECRET:-}"

WECHAT_CALLBACK_ORIGIN="${WECHAT_CALLBACK_ORIGIN:-https://socthink.cn}"
WECHAT_LOGIN_MODE="${WECHAT_LOGIN_MODE:-official_account}"
WECHAT_AUTH_TYPE="${WECHAT_AUTH_TYPE:-open}"
WECHAT_MP_TEMPLATE_ID="${WECHAT_MP_TEMPLATE_ID:-}"

ENV_FILE="${ENV_FILE:-/etc/socthink-math-wechat.env}"
DROPIN_DIR="/etc/systemd/system/socthink-math.service.d"
DROPIN_FILE="${DROPIN_DIR}/30-wechat-auth.conf"

install -d -m 0755 "$DROPIN_DIR"
umask 077
# This file also holds Mini Program credentials. Never truncate it during a
# website-login upgrade: silently dropping WECHAT_MINIAPP_* breaks production.
if [[ -n "$WECHAT_WEBSITE_APPID" || -n "$WECHAT_WEBSITE_SECRET" ]]; then
  : "${WECHAT_WEBSITE_APPID:?Provide matching website application AppID and secret together}"
  : "${WECHAT_WEBSITE_SECRET:?Provide matching website application AppID and secret together}"
fi
install -d -m 0700 "$(dirname "$ENV_FILE")"
temp_file="$(mktemp "$(dirname "$ENV_FILE")/.wechat-env.XXXXXX")"
trap 'rm -f "$temp_file"' EXIT
if [[ -f "$ENV_FILE" ]]; then
  grep -vE '^(WECHAT_OPEN_APPID|WECHAT_OPEN_SECRET|WECHAT_CALLBACK_ORIGIN|WECHAT_LOGIN_MODE|WECHAT_AUTH_TYPE|WECHAT_MP_TEMPLATE_ID)=' "$ENV_FILE" > "$temp_file" || true
  if [[ -n "$WECHAT_WEBSITE_APPID" ]]; then
    sed -i -E '/^(WECHAT_WEBSITE_APPID|WECHAT_WEBSITE_SECRET)=/d' "$temp_file"
  fi
fi
{
  printf 'WECHAT_OPEN_APPID=%s\n' "$WECHAT_OPEN_APPID"
  printf 'WECHAT_OPEN_SECRET=%s\n' "$WECHAT_OPEN_SECRET"
  if [[ -n "$WECHAT_WEBSITE_APPID" ]]; then
    printf 'WECHAT_WEBSITE_APPID=%s\n' "$WECHAT_WEBSITE_APPID"
    printf 'WECHAT_WEBSITE_SECRET=%s\n' "$WECHAT_WEBSITE_SECRET"
  fi
  printf 'WECHAT_CALLBACK_ORIGIN=%s\n' "$WECHAT_CALLBACK_ORIGIN"
  printf 'WECHAT_LOGIN_MODE=%s\n' "$WECHAT_LOGIN_MODE"
  printf 'WECHAT_AUTH_TYPE=%s\n' "$WECHAT_AUTH_TYPE"
  printf 'WECHAT_MP_TEMPLATE_ID=%s\n' "$WECHAT_MP_TEMPLATE_ID"
} >> "$temp_file"
chmod 0600 "$temp_file"
mv -f "$temp_file" "$ENV_FILE"
trap - EXIT

cat > "$DROPIN_FILE" <<EOF
[Service]
EnvironmentFile=$ENV_FILE
EOF
chmod 0644 "$DROPIN_FILE"

systemctl daemon-reload
systemctl restart socthink-math.service

for _ in $(seq 1 30); do
  status="$(curl -fsS http://127.0.0.1:3000/api/auth/parent/status 2>/dev/null || true)"
  if [[ "$status" == *'"wechatLoginConfigured":true'* ]]; then
    echo "WECHAT_PARENT_AUTH=READY"
    exit 0
  fi
  sleep 1
done

echo "ERROR: application did not report WeChat auth readiness" >&2
exit 1
