#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pgbin="${PG18_BIN:-/usr/lib/postgresql/18/bin}"
tmp="$(mktemp -d /tmp/soc-direct-exam-ci.XXXXXX)"
trap '"$pgbin/pg_ctl" -D "$tmp/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$tmp"' EXIT
# Existing preview check requires localhost TCP. Bind ONLY loopback, random
# high port, isolated temporary database with a random SCRAM password.
pw=$(openssl rand -hex 24)
printf '%s\n' "$pw" > "$tmp/password"
chmod 600 "$tmp/password"
"$pgbin/initdb" -D "$tmp/db" -A scram-sha-256 --pwfile="$tmp/password" --no-locale >/dev/null
port=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')
"$pgbin/pg_ctl" -D "$tmp/db" -l "$tmp/log" -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=$tmp -p $port" -w start >/dev/null
export PGPASSWORD="$pw"
p(){ "$pgbin/psql" -X -qAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$port" -d "${DB:-postgres}" "$@"; }
p -c 'CREATE DATABASE voucher_ci;'
export DB=voucher_ci
for f in ops/db/00*.sql ops/db/010*.sql ops/db/011*.sql; do p -f "$f" >/dev/null; done
p -c 'CREATE ROLE socthink_billing NOLOGIN;'
p -f ops/db/015_platform_organization_seats.sql >/dev/null
for f in channel_voucher_receipt_projection exam_access_usage channel_exam_bridge direct_exam_checkout exam_paper_access; do p -f "ops/db/drafts/$f.sql" >/dev/null; done
export NODE_ENV=development SOCTHINK_VOUCHER_PREVIEW=1 SOCTHINK_PUBLIC_ORIGIN=http://localhost:3000
export SOCTHINK_BILLING_DATABASE_URL="postgresql://$(id -un):$pw@127.0.0.1:$port/voucher_ci"
export SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY="$(openssl rand -hex 32)"
node_modules/.bin/tsx scripts/test_direct_exam_checkout_preview.ts
export SOCTHINK_USER_DATA_DIR="$tmp/users"
node_modules/.bin/tsx scripts/test_voucher_redeem_route_preview.ts
node_modules/.bin/tsx scripts/test_exam_paper_access_preview.ts
