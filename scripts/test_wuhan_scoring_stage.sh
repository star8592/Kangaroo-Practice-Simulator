#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d /tmp/wh-stage-ci.XXXXXX)
pg=/usr/lib/postgresql/18/bin
api=""
trap 'if [[ -n "$api" ]]; then kill "$api" >/dev/null 2>&1 || true; wait "$api" >/dev/null 2>&1 || true; fi; "$pg/pg_ctl" -D "$tmp/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT
port=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')
pw=$(openssl rand -hex 24)
printf '%s\n' "$pw" > "$tmp/pw";chmod 600 "$tmp/pw"
"$pg/initdb" -D "$tmp/db" -A scram-sha-256 --pwfile="$tmp/pw" --no-locale >/dev/null
"$pg/pg_ctl" -D "$tmp/db" -l "$tmp/log" -o "-k $tmp -c listen_addresses=127.0.0.1 -p $port -c shared_buffers=32MB" start >/dev/null
export PGPASSWORD="$pw"
"$pg/createdb" -h 127.0.0.1 -p "$port" wuhan_stage_ci
export WUHAN_STAGE_TEST_DB="postgres://$(id -un):$pw@127.0.0.1:$port/wuhan_stage_ci"
psql -h 127.0.0.1 -p "$port" -d wuhan_stage_ci -v ON_ERROR_STOP=1 -q -c 'CREATE SCHEMA exam_access_draft'
for f in wuhan_research_report_archive wuhan_research_report_erasure wuhan_research_attempt_ticket wuhan_research_strict_archive wuhan_research_scoring_queue wuhan_research_scoring_stage; do
 psql -h 127.0.0.1 -p "$port" -d wuhan_stage_ci -v ON_ERROR_STOP=1 -q -f "ops/db/drafts/$f.sql"
done
node_modules/.bin/tsx scripts/test_wuhan_scoring_stage.ts

if [[ "${WUHAN_R92_REAL_WORKER:-0}" == "1" || "${WUHAN_R92_ROUTES:-0}" == "1" ]]; then
 export NODE_ENV=development SOCTHINK_VOUCHER_PREVIEW=1 SOCTHINK_WUHAN_ASYNC_PREVIEW=1 SOCTHINK_RESEARCH_LEGACY_FIXTURE=0
 export SOCTHINK_BILLING_DATABASE_URL="$WUHAN_STAGE_TEST_DB" SOCTHINK_PUBLIC_ORIGIN=http://localhost:3000
 export SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY="$(openssl rand -hex 32)" SOCTHINK_RESEARCH_ARCHIVE_KEY="$(openssl rand -hex 32)"
 export SOCTHINK_USER_DATA_DIR="$tmp/users"
 mkdir -m 700 "$SOCTHINK_USER_DATA_DIR"
 printf '%s' "$(openssl rand -hex 48)" > "$SOCTHINK_USER_DATA_DIR/parent-session-secret.txt"
 printf '%s' '[{"id":"par_cccccccccccccccc","name":"Synthetic fixture","wechatId":"fixture","active":true,"sessionVersion":1},{"id":"par_dddddddddddddddd","name":"Other fixture","wechatId":"fixture-other","active":true,"sessionVersion":1}]' > "$SOCTHINK_USER_DATA_DIR/parents.json"
 chmod 600 "$SOCTHINK_USER_DATA_DIR/"*.*
 if [[ "${WUHAN_R92_ROUTES:-0}" == "1" ]]; then
  export SOCTHINK_WUHAN_STAGE_KEY_FILE="$tmp/stage-key"
  printf '%s' "$(openssl rand -hex 32)" > "$SOCTHINK_WUHAN_STAGE_KEY_FILE";chmod 600 "$SOCTHINK_WUHAN_STAGE_KEY_FILE"
  node_modules/.bin/tsx scripts/test_wuhan_r92_submission_routes.ts
 fi
fi
if [[ "${WUHAN_R92_REAL_WORKER:-0}" == "1" ]]; then
 apiport=$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')
 export SOCTHINK_COMMERCE_BIND="127.0.0.1:$apiport" WUHAN_STAGE_ARCHIVE_ORIGIN="http://127.0.0.1:$apiport"
 cargo build --manifest-path backend/socthink-core/Cargo.toml --locked --offline --bin socthink-commerce-api >/dev/null
 backend/socthink-core/target/debug/socthink-commerce-api > "$tmp/api.log" 2>&1 & api=$!
 for i in $(seq 1 30); do if curl -fsS "$WUHAN_STAGE_ARCHIVE_ORIGIN/healthz" >/dev/null 2>&1; then break; fi; sleep 1; done
 curl -fsS "$WUHAN_STAGE_ARCHIVE_ORIGIN/healthz" >/dev/null
 node_modules/.bin/tsx scripts/test_wuhan_r92_real_worker.ts
fi
