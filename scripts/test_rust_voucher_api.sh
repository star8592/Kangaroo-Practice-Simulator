#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TMP="$(mktemp -d /tmp/socthink-rust-voucher-api.XXXXXX)"
API_PID=""
OWN_PG=0
PG_BIN="/usr/lib/postgresql/18/bin"
if [[ -n "$(printenv PG18_BIN 2>/dev/null || true)" ]]; then PG_BIN="$(printenv PG18_BIN)"; fi
API_PORT="$(printenv SOCTHINK_COMMERCE_TEST_PORT 2>/dev/null || python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
cleanup() {
  if [[ -n "$API_PID" ]]; then kill "$API_PID" >/dev/null 2>&1 || true; wait "$API_PID" >/dev/null 2>&1 || true; fi
  if [[ "$OWN_PG" == "1" ]]; then "$PG_BIN/pg_ctl" -D "$TMP/pg" -m immediate stop >/dev/null 2>&1 || true; fi
  rm -rf -- "$TMP"
}
trap cleanup EXIT

if [[ -n "$(printenv SOCTHINK_BILLING_DATABASE_URL 2>/dev/null || true)" ]]; then
  [[ "$(printenv SOCTHINK_BILLING_TEST_ISOLATED 2>/dev/null || true)" == "1" ]] || { echo "REFUSING non-isolated billing database"; exit 2; }
  DATABASE_URL="$(printenv SOCTHINK_BILLING_DATABASE_URL)"
  python3 - "$DATABASE_URL" <<'PY'
import sys,urllib.parse
u=urllib.parse.urlparse(sys.argv[1])
if u.hostname not in ("127.0.0.1","localhost") or not u.path.lstrip("/").endswith("_ci"):
    raise SystemExit("REFUSING database outside localhost *_ci")
PY
else
  [[ -x "$PG_BIN/initdb" && -x "$PG_BIN/pg_ctl" ]] || { echo "PostgreSQL 18 binaries required when no isolated database URL is supplied"; exit 2; }
  "$PG_BIN/initdb" -D "$TMP/pg" -A trust --no-locale >/dev/null
  PG_PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
  "$PG_BIN/pg_ctl" -D "$TMP/pg" -l "$TMP/pg.log" -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=$TMP -p $PG_PORT" -w start >/dev/null
  OWN_PG=1
  "$PG_BIN/createdb" -h 127.0.0.1 -p "$PG_PORT" socthink_voucher_ci
  DATABASE_URL="postgres://$(id -un)@127.0.0.1:$PG_PORT/socthink_voucher_ci"
fi

psql_db() { psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -q "$@"; }
for migration in ops/db/00*.sql ops/db/010*.sql ops/db/011*.sql; do
  [[ -f "$migration" ]] && psql_db -f "$migration" >/dev/null
done
psql_db -c 'DO $$ BEGIN CREATE ROLE socthink_billing NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;' >/dev/null
psql_db -f ops/db/015_platform_organization_seats.sql >/dev/null
psql_db -f ops/db/drafts/channel_voucher_receipt_projection.sql >/dev/null
psql_db -f ops/db/drafts/exam_access_usage.sql >/dev/null
psql_db -f ops/db/drafts/channel_exam_bridge.sql >/dev/null
psql_db -f ops/db/drafts/exam_paper_access.sql >/dev/null

RUN_HEX="$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
OTHER_HEX="$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')"
OWNER_ID="par_$RUN_HEX"
OTHER_ID="par_$OTHER_HEX"
PRODUCT_ID="wh-rust-api-$RUN_HEX"
MERCHANT_ID="shop-$RUN_HEX"
EXTERNAL_SKU="sku-$RUN_HEX"
ORDER_LINE="line-$RUN_HEX"
PAPER_ID="paper-$RUN_HEX"
TXN_ID="txn-$RUN_HEX"
psql_db -c "INSERT INTO billing_products(id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled,rights_approved,delivery_verified,access_restricted)
VALUES('$PRODUCT_ID',NULL,NULL,'exam_access','exam_access','wuhan-2027','武汉2027接口测试卡',3990,'CNY',true,true,true,true);"
psql_db -c "INSERT INTO exam_access_draft.offer_terms VALUES('$PRODUCT_ID',30,now()+interval '10 days','all_verified_papers_and_updates');
INSERT INTO voucher_draft.channel_mapping SELECT 'xiaohongshu','$MERCHANT_ID','$EXTERNAL_SKU',product_id,capacity,expires_at,true FROM exam_access_draft.offer_terms WHERE product_id='$PRODUCT_ID';
INSERT INTO exam_access_draft.paper_registry(exam_key,paper_id,verified,available) VALUES('wuhan-2027','$PAPER_ID',true,true);"

export NODE_ENV=development
export SOCTHINK_VOUCHER_PREVIEW=1
export SOCTHINK_BILLING_DATABASE_URL="$DATABASE_URL"
export SOCTHINK_PUBLIC_ORIGIN=http://localhost:3000
export SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY="$(printf 'b%.0s' {1..64})"
export SOCTHINK_USER_DATA_DIR="$TMP/users"
export SOCTHINK_COMMERCE_BIND="127.0.0.1:$API_PORT"
mkdir -m 700 -p "$SOCTHINK_USER_DATA_DIR"
SESSION_SECRET="$(printf 'a%.0s' {1..96})"
printf '%s' "$SESSION_SECRET" > "$SOCTHINK_USER_DATA_DIR/parent-session-secret.txt"
chmod 600 "$SOCTHINK_USER_DATA_DIR/parent-session-secret.txt"
cat > "$SOCTHINK_USER_DATA_DIR/parents.json" <<JSON
[
 {"id":"$OWNER_ID","name":"Owner fixture","wechatId":"wx-owner-fixture","active":true,"sessionVersion":1},
 {"id":"$OTHER_ID","name":"Other fixture","wechatId":"wx-other-fixture","active":true,"sessionVersion":1}
]
JSON
cat > "$SOCTHINK_USER_DATA_DIR/site-owner-binding.json" <<JSON
{"version":1,"parentId":"$OWNER_ID","contactEmail":"owner@example.test","emailVerifiedAt":null,"boundAt":1,"grantedByAdminId":"isolated-fixture"}
JSON
chmod 600 "$SOCTHINK_USER_DATA_DIR/parents.json" "$SOCTHINK_USER_DATA_DIR/site-owner-binding.json"

make_token() {
  SESSION_SECRET="$SESSION_SECRET" FIXTURE_UID="$1" node - <<'NODE'
const crypto=require("node:crypto");
const body=Buffer.from(JSON.stringify({uid:process.env.FIXTURE_UID,ver:1,exp:Math.floor(Date.now()/1000)+3600})).toString("base64url");
const sig=crypto.createHmac("sha256",process.env.SESSION_SECRET).update(body).digest("base64url");
process.stdout.write(body+"."+sig);
NODE
}
OWNER_TOKEN="$(make_token "$OWNER_ID")"
OTHER_TOKEN="$(make_token "$OTHER_ID")"
CODE="SOC-1-0123456789abcdefghijklmnopqrstuv"
LOOKUP_DIGEST="$(CODE="$CODE" LOOKUP_KEY="$SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY" python3 - <<'PY'
import hashlib,hmac,os
key=bytes.fromhex(os.environ["LOOKUP_KEY"])
msg=b"soc-voucher-lookup\0"+os.environ["CODE"].encode()
print(hmac.new(key,msg,hashlib.sha256).hexdigest())
PY
)"
RECEIPT_DIGEST="$(printf 'isolated-provider-receipt' | sha256sum | cut -d' ' -f1)"
ISSUE_RESULT="$(psql_db -At -c "SELECT voucher_draft.issue_exam('xiaohongshu','$MERCHANT_ID','$ORDER_LINE',0,'$EXTERNAL_SKU','$TXN_ID',3990,'CNY','$LOOKUP_DIGEST','$RECEIPT_DIGEST',now())")"
[[ "$ISSUE_RESULT" == "issued" ]]

cargo build --locked --offline --manifest-path backend/socthink-core/Cargo.toml --bin socthink-commerce-api >/dev/null
env NODE_ENV="$NODE_ENV" SOCTHINK_VOUCHER_PREVIEW="$SOCTHINK_VOUCHER_PREVIEW" \
  SOCTHINK_BILLING_DATABASE_URL="$SOCTHINK_BILLING_DATABASE_URL" \
  SOCTHINK_PUBLIC_ORIGIN="$SOCTHINK_PUBLIC_ORIGIN" \
  SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY="$SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY" \
  SOCTHINK_USER_DATA_DIR="$SOCTHINK_USER_DATA_DIR" SOCTHINK_COMMERCE_BIND="$SOCTHINK_COMMERCE_BIND" \
  backend/socthink-core/target/debug/socthink-commerce-api >"$TMP/api.log" 2>&1 &
API_PID=$!
BASE="http://127.0.0.1:$API_PORT"
for _ in $(seq 1 40); do
  if curl -fsS "$BASE/healthz" >/dev/null 2>&1; then break; fi
  kill -0 "$API_PID" 2>/dev/null || { cat "$TMP/api.log"; exit 1; }
  sleep 0.2
done
curl -fsS "$BASE/healthz" >/dev/null

request() {
  local expected="$1"; shift
  local actual
  actual="$(curl -sS -o "$TMP/response.json" -w '%{http_code}' "$@")"
  [[ "$actual" == "$expected" ]] || { echo "HTTP expected=$expected actual=$actual"; cat "$TMP/response.json"; exit 1; }
}
request 401 "$BASE/api/platform/admin/commerce"
request 403 -H "Cookie: socthink_parent_session=$OTHER_TOKEN" "$BASE/api/platform/admin/commerce"
request 200 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$BASE/api/platform/admin/commerce?state=unclaimed&q=$ORDER_LINE"
python3 - "$TMP/response.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert len(d["rows"])==1 and d["rows"][0]["status"]=="unclaimed"
assert d["rows"][0]["amount_minor"]=="3990"
assert "code_digest" not in json.dumps(d)
assert "verified_receipt_digest" not in json.dumps(d)
PY
request 401 "$BASE/api/platform/billing/exam-access"
request 200 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$BASE/api/platform/billing/exam-access"
python3 - "$TMP/response.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert d["remainingScoredAttempts"]==0 and d["activeCards"]==0
PY
request 403 -X POST -H "Cookie: socthink_parent_session=$OWNER_TOKEN" -H 'Content-Type: application/json' --data "{\"code\":\"$CODE\"}" "$BASE/api/platform/billing/redeem"
request 400 -X POST -H "Origin: http://localhost:3000" -H "Sec-Fetch-Site: same-origin" -H "Cookie: socthink_parent_session=$OWNER_TOKEN" -H 'Content-Type: application/json' --data '{"code":"bad"}' "$BASE/api/platform/billing/redeem"
request 200 -X POST -H "Origin: http://localhost:3000" -H "Sec-Fetch-Site: same-origin" -H "Cookie: socthink_parent_session=$OWNER_TOKEN" -H 'Content-Type: application/json' --data "{\"code\":\"$CODE\"}" "$BASE/api/platform/billing/redeem"
grep -q '"ACTIVATED"' "$TMP/response.json"
request 200 -X POST -H "Origin: http://localhost:3000" -H "Sec-Fetch-Site: same-origin" -H "Cookie: socthink_parent_session=$OWNER_TOKEN" -H 'Content-Type: application/json' --data "{\"code\":\"$CODE\"}" "$BASE/api/platform/billing/redeem"
request 409 -X POST -H "Origin: http://localhost:3000" -H "Sec-Fetch-Site: same-origin" -H "Cookie: socthink_parent_session=$OTHER_TOKEN" -H 'Content-Type: application/json' --data "{\"code\":\"$CODE\"}" "$BASE/api/platform/billing/redeem"
request 200 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$BASE/api/platform/billing/exam-access"
python3 - "$TMP/response.json" "$PAPER_ID" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert d["remainingScoredAttempts"]==30 and d["activeCards"]==1
assert d["availablePaperIds"]==[sys.argv[2]]
PY
request 200 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$BASE/api/platform/admin/commerce?state=activated&q=$ORDER_LINE"
python3 - "$TMP/response.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert len(d["rows"])==1 and d["rows"][0]["status"]=="activated"
PY

psql_db -c "SELECT voucher_draft.refund_exam('xiaohongshu','$MERCHANT_ID','$ORDER_LINE',0,repeat('c',64),now())" >/dev/null
request 200 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$BASE/api/platform/billing/exam-access"
python3 - "$TMP/response.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert d["remainingScoredAttempts"]==0 and d["activeCards"]==0
PY
request 409 -X POST -H "Origin: http://localhost:3000" -H "Sec-Fetch-Site: same-origin" -H "Cookie: socthink_parent_session=$OWNER_TOKEN" -H 'Content-Type: application/json' --data "{\"code\":\"$CODE\"}" "$BASE/api/platform/billing/redeem"
request 200 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$BASE/api/platform/admin/commerce?state=refunded&q=$ORDER_LINE"
python3 - "$TMP/response.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
assert len(d["rows"])==1 and d["rows"][0]["status"]=="refunded"
PY

echo "RUST_VOUCHER_API_E2E=PASS auth=verified owner_scope=verified idempotent_claim=PASS cross_account_rejected=PASS refund_revokes_future_access=PASS no_raw_codes=PASS"
