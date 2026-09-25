#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

: "${SMTP_USER:?Set SMTP_USER to the verified sender mailbox}"
: "${SMTP_PASS:?Set SMTP_PASS to the mailbox SMTP authorization code/password}"

SMTP_HOST="${SMTP_HOST:-smtp.exmail.qq.com}"
SMTP_PORT="${SMTP_PORT:-465}"
SMTP_SECURE="${SMTP_SECURE:-true}"
AUTH_FROM_EMAIL="${AUTH_FROM_EMAIL:-Socthink 数学训练 <${SMTP_USER}>}"
ENV_FILE="${ENV_FILE:-/etc/socthink-math-auth-email.env}"
DROPIN_DIR="/etc/systemd/system/socthink-math.service.d"
DROPIN_FILE="${DROPIN_DIR}/20-auth-email.conf"

install -d -m 0755 "$DROPIN_DIR"
umask 077
cat > "$ENV_FILE" <<ENV
AUTH_EMAIL_PROVIDER=smtp
AUTH_FROM_EMAIL=${AUTH_FROM_EMAIL}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_SECURE=${SMTP_SECURE}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
ENV
chmod 0600 "$ENV_FILE"

cat > "$DROPIN_FILE" <<EOF2
[Service]
EnvironmentFile=${ENV_FILE}
EOF2
chmod 0644 "$DROPIN_FILE"

systemctl daemon-reload
systemctl restart socthink-math.service

for _ in $(seq 1 30); do
  if status="$(curl -fsS http://127.0.0.1:3000/api/auth/parent/status 2>/dev/null)"; then
    if STATUS_JSON="$status" python3 - <<'PY'
import json,os,sys
s=json.loads(os.environ["STATUS_JSON"])
if s.get("registrationEnabled") is True and s.get("emailProviderConfigured") is True:
    print("AUTH_EMAIL_PRODUCTION=READY")
    sys.exit(0)
sys.exit(1)
PY
    then
      exit 0
    fi
  fi
  sleep 1
done

echo "ERROR: application did not report production email readiness" >&2
exit 1
