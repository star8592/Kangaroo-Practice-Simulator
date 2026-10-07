#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

: "${WECHAT_MINIAPP_APPID:?Set WECHAT_MINIAPP_APPID}"
: "${WECHAT_MINIAPP_SECRET:?Set WECHAT_MINIAPP_SECRET}"

if [[ ! "$WECHAT_MINIAPP_APPID" =~ ^wx[0-9a-fA-F]{16}$ ]]; then
  echo "ERROR: invalid mini-program AppID" >&2
  exit 2
fi
if [[ ${#WECHAT_MINIAPP_SECRET} -lt 16 ]]; then
  echo "ERROR: mini-program AppSecret is too short" >&2
  exit 2
fi

ENV_FILE="${ENV_FILE:-/etc/socthink-math-miniapp.env}"
DROPIN_DIR="/etc/systemd/system/socthink-math.service.d"
DROPIN_FILE="${DROPIN_DIR}/31-miniapp-auth.conf"

install -d -m 0755 "$DROPIN_DIR"
umask 077
{
  printf 'WECHAT_MINIAPP_APPID=%s\n' "$WECHAT_MINIAPP_APPID"
  printf 'WECHAT_MINIAPP_SECRET=%s\n' "$WECHAT_MINIAPP_SECRET"
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
  status="$(curl -sS -o /tmp/socthink-miniapp-auth-check.json -w '%{http_code}'     -X POST http://127.0.0.1:3000/api/auth/miniapp/wechat     -H 'content-type: application/json'     --data '{"code":"configurationcheck123"}' 2>/dev/null || true)"
  if [[ "$status" != "000" && "$status" != "503" && "$status" != "404" ]]; then
    echo "WECHAT_MINIAPP_AUTH=CONFIGURED status=$status"
    exit 0
  fi
  sleep 1
done

echo "ERROR: mini-program auth endpoint did not load configured credentials" >&2
exit 1
