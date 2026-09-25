#!/usr/bin/env bash
set -euo pipefail
f=ops/release/install_auth_email_smtp.sh
grep -Fq ': "${SMTP_USER:?Set SMTP_USER to the verified sender mailbox}"' "$f"
grep -Fq ': "${SMTP_PASS:?Set SMTP_PASS to the mailbox SMTP authorization code/password}"' "$f"
grep -Fq 'chmod 0600 "$ENV_FILE"' "$f"
grep -Fq 'EnvironmentFile=${ENV_FILE}' "$f"
grep -Fq 'smtp.exmail.qq.com' "$f"
grep -Fq 'registrationEnabled' "$f"
echo "AUTH_EMAIL_SMTP_CONTRACT=PASS"
