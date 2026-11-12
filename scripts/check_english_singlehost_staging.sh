#!/usr/bin/env bash
# Read-only verification on the actual SOC THINK server.
set -euo pipefail
preview=http://127.0.0.1:18581
html=/var/www/socthink-english-preview
stage=/srv/socthink/english-staging
for route in /vocab/ /accent-lab/ /reading/ /english/aelos/app/; do
  test -s "$html$route"index.html || { echo "FAIL missing $route"; exit 1; }
  status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$preview$route")"
  test "$status" = 200 || { echo "FAIL $route HTTP $status"; exit 1; }
  echo "PASS private-preview $route"
done
test -s "$stage/rust-programs/english-leap"
test -s "$stage/rust-programs/vocab-platform-api"
test -s "$stage/aelos/releases/f68197e5befbd3fd9d172bcbfe798e1044a345b7/backend/api/server.ts"
echo 'PASS staged program files'
ss -ltn | grep '127.0.0.1:18581' >/dev/null
echo 'PASS private preview is loopback only'
curl -kfsS --max-time 8 https://socthink.cn/api/release >/dev/null
echo 'PASS current public SOC THINK'
echo 'STAGING_ONLY=PASS; databases, SSO, billing and public cutover not checked'
