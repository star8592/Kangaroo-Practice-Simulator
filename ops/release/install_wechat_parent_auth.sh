#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

: "${WECHAT_OPEN_APPID:?Set WECHAT_OPEN_APPID}"
: "${WECHAT_OPEN_SECRET:?Set WECHAT_OPEN_SECRET}"

WECHAT_CALLBACK_ORIGIN="${WECHAT_CALLBACK_ORIGIN:-https://socthink.cn}"
WECHAT_LOGIN_MODE="${WECHAT_LOGIN_MODE:-official_account}"
WECHAT_AUTH_TYPE="${WECHAT_AUTH_TYPE:-open}"
WECHAT_MP_TEMPLATE_ID="${WECHAT_MP_TEMPLATE_ID:-}"

ENV_FILE="${ENV_FILE:-/etc/socthink-math-wechat.env}"
DROPIN_DIR="/etc/systemd/system/socthink-math.service.d"
DROPIN_FILE="${DROPIN_DIR}/30-wechat-auth.conf"

install -d -m 0755 "$DROPIN_DIR"
umask 077
{
  printf 'WECHAT_OPEN_APPID=%s\n' "$WECHAT_OPEN_APPID"
  printf 'WECHAT_OPEN_SECRET=%s\n' "$WECHAT_OPEN_SECRET"
  printf 'WECHAT_CALLBACK_ORIGIN=%s\n' "$WECHAT_CALLBACK_ORIGIN"
  printf 'WECHAT_LOGIN_MODE=%s\n' "$WECHAT_LOGIN_MODE"
  printf 'WECHAT_AUTH_TYPE=%s\n' "$WECHAT_AUTH_TYPE"
  printf 'WECHAT_MP_TEMPLATE_ID=%s\n' "$WECHAT_MP_TEMPLATE_ID"
} > "$ENV_FILE"
chmod 0600 "$ENV_FILE"

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
