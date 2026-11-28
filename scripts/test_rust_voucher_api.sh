#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TMP="$(mktemp -d /tmp/socthink-rust-voucher-api.XXXXXX)"
API_PID=""
NEXT_PID=""
OWN_PG=0
PG_BIN="/usr/lib/postgresql/18/bin"
if [[ -n "$(printenv PG18_BIN 2>/dev/null || true)" ]]; then PG_BIN="$(printenv PG18_BIN)"; fi
API_PORT="$(printenv SOCTHINK_COMMERCE_TEST_PORT 2>/dev/null || python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
cleanup() {
  if [[ -n "$NEXT_PID" ]]; then kill -- "-$NEXT_PID" >/dev/null 2>&1 || true; wait "$NEXT_PID" >/dev/null 2>&1 || true; fi
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
  PG_PASSWORD="$(openssl rand -hex 24)"
  printf '%s\n' "$PG_PASSWORD" >"$TMP/pg-password"
  chmod 600 "$TMP/pg-password"
  "$PG_BIN/initdb" -D "$TMP/pg" -A scram-sha-256 --pwfile="$TMP/pg-password" --no-locale >/dev/null
  PG_PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
  "$PG_BIN/pg_ctl" -D "$TMP/pg" -l "$TMP/pg.log" -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=$TMP -p $PG_PORT" -w start >/dev/null
  OWN_PG=1
  PGPASSWORD="$PG_PASSWORD" "$PG_BIN/createdb" -h 127.0.0.1 -p "$PG_PORT" socthink_voucher_ci
  DATABASE_URL="postgres://$(id -un):$PG_PASSWORD@127.0.0.1:$PG_PORT/socthink_voucher_ci"
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
psql_db -f ops/db/drafts/wuhan_research_report_archive.sql >/dev/null
psql_db -f ops/db/drafts/wuhan_research_report_erasure.sql >/dev/null
psql_db -f ops/db/drafts/wuhan_research_attempt_ticket.sql >/dev/null
psql_db -f ops/db/drafts/wuhan_research_strict_archive.sql >/dev/null

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
export SOCTHINK_RESEARCH_ARCHIVE_KEY="$(openssl rand -hex 32)"
export SOCTHINK_RESEARCH_TICKET_KEY="$(openssl rand -hex 32)"
# Older synthetic archive tests must explicitly request their compatibility mode.
export SOCTHINK_RESEARCH_LEGACY_FIXTURE=0
if [[ "${SOCTHINK_TEST_AUTO_ARCHIVE:-0}" == "1" ]]; then
 export SOCTHINK_RESEARCH_LEGACY_FIXTURE=1
fi
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

REPORT_ID="$(python3 - "$TMP/report.json" <<'PYREPORT'
import json,sys,secrets,os
from pathlib import Path
source=os.environ.get("WUHAN_SYNTHETIC_REPORT_FIXTURE")
if source:
    p=Path(source).resolve()
    assert p.parent==Path("/tmp") and p.name.startswith("wuhan-r72-synthetic-")
    report=json.loads(p.read_text())
else:
    report={"attempt_id":secrets.token_hex(16),"paper_id":"WH01","finalized":True,
            "billable":False,"official_score":False,"report_status":"research","total_score":None,
            "total_tasks":18,"items":[{"task_id":f"fixture-{i}","state":"not_submitted"} for i in range(18)],
            "rubric_sha256":"a"*64,"report_evidence_sha256":"b"*64}
assert report["report_status"]=="research" and report["billable"] is False and report["total_score"] is None
Path(sys.argv[1]).write_text(json.dumps(report,ensure_ascii=False))
print(report["attempt_id"])
PYREPORT
)"
# Trusted test writer only, not a browser upload endpoint.
psql_db -v owner="$OWNER_ID" -v report_id="$REPORT_ID" -v report_json="$(cat "$TMP/report.json")" <<'SQLREPORT'
INSERT INTO exam_access_draft.research_report_archive(attempt_id,owner_id,paper_id,payload)
VALUES(:'report_id',:'owner',(:'report_json'::jsonb)->>'paper_id',:'report_json'::jsonb);
SQLREPORT
cargo build --locked --offline --manifest-path backend/socthink-core/Cargo.toml --bin socthink-commerce-api >/dev/null
env NODE_ENV="$NODE_ENV" SOCTHINK_VOUCHER_PREVIEW="$SOCTHINK_VOUCHER_PREVIEW" \
  SOCTHINK_BILLING_DATABASE_URL="$SOCTHINK_BILLING_DATABASE_URL" \
  SOCTHINK_PUBLIC_ORIGIN="$SOCTHINK_PUBLIC_ORIGIN" \
  SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY="$SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY" \
  SOCTHINK_USER_DATA_DIR="$SOCTHINK_USER_DATA_DIR" SOCTHINK_COMMERCE_BIND="$SOCTHINK_COMMERCE_BIND" \
  "${CARGO_TARGET_DIR:-$ROOT/backend/socthink-core/target}/debug/socthink-commerce-api" >"$TMP/api.log" 2>&1 &
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
if [[ "$SOCTHINK_RESEARCH_LEGACY_FIXTURE" == "0" ]]; then
 WUHAN_TICKET_TEST_ORIGIN="$BASE" WUHAN_TICKET_OWNER_SESSION="$OWNER_TOKEN" WUHAN_TICKET_OTHER_SESSION="$OTHER_TOKEN" \
 WUHAN_TICKET_OWNER_ID="$OWNER_ID" WUHAN_TICKET_OTHER_ID="$OTHER_ID" \
 python3 -B scripts/test_wuhan_strict_archive_http.py
fi
if [[ "${SOCTHINK_TEST_R79_LIVE_PAGE:-0}" == "1" ]]; then
  [[ "$SOCTHINK_RESEARCH_LEGACY_FIXTURE" == "0" && "${SOCTHINK_TEST_TICKET_ATTEMPT:-0}" == "0" ]] || { echo "Run R79 live page separately in strict mode"; exit 1; }
  ACCENT_ROOT="$WUHAN_ACCENT_RESEARCH_ROOT"
  python3 scripts/project_wuhan_research_contract.py "$ACCENT_ROOT"
  WUHAN_TICKET_TEST_ORIGIN="$BASE" WUHAN_TICKET_OWNER_SESSION="$OWNER_TOKEN" WUHAN_TICKET_OTHER_SESSION="$OTHER_TOKEN" \
  WUHAN_TICKET_OWNER_ID="$OWNER_ID" WUHAN_TICKET_OTHER_ID="$OTHER_ID" \
  python3 -u scripts/test_wuhan_r79_live_report.py "$ACCENT_ROOT" "$WUHAN_ACCENT_RESEARCH_BINARY" "$TMP/r79-live.json"
  R79_REPORT_ID="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["attempt_id"])' "$TMP/r79-live.json")"
  [[ "$(psql_db -At -c "SELECT count(*) FROM exam_access_draft.research_report_archive a JOIN exam_access_draft.research_attempt_ticket t USING(attempt_id) WHERE a.attempt_id='$R79_REPORT_ID' AND t.claimed_at IS NOT NULL AND a.owner_id=t.owner_id AND a.paper_id=t.paper_id")" == "1" ]]
  [[ "$(psql_db -At -c 'SELECT count(*) FROM exam_access_draft.completed_reports')" == "0" ]]
fi
if [[ "${SOCTHINK_TEST_TICKET_ATTEMPT:-0}" == "1" ]]; then
  ACCENT_ROOT="$WUHAN_ACCENT_RESEARCH_ROOT"
  python3 scripts/project_wuhan_research_contract.py "$ACCENT_ROOT"
  (cd "$ACCENT_ROOT"; cargo build --locked --offline --example wuhan-oral-preview-api >/dev/null;
   export WUHAN_RESEARCH_ARCHIVE_ORIGIN="$BASE" WUHAN_RESEARCH_ARCHIVE_KEY="$SOCTHINK_RESEARCH_ARCHIVE_KEY" WUHAN_RESEARCH_TICKET_KEY="$SOCTHINK_RESEARCH_TICKET_KEY"
   export WUHAN_TEST_OWNER_SESSION="$OWNER_TOKEN" WUHAN_TEST_OTHER_SESSION="$OTHER_TOKEN" WUHAN_TEST_OWNER_ID="$OWNER_ID" WUHAN_TEST_OTHER_ID="$OTHER_ID"
   python3 -u scripts/evidence_lab/test_wuhan_ticket_attempt.py)
  [[ "$(psql_db -At -c 'SELECT count(*) FROM exam_access_draft.research_report_archive a JOIN exam_access_draft.research_attempt_ticket t USING(attempt_id) WHERE t.claimed_at IS NOT NULL AND a.owner_id=t.owner_id AND a.paper_id=t.paper_id')" == "$(if [[ "$SOCTHINK_RESEARCH_LEGACY_FIXTURE" == "0" ]]; then echo 3; else echo 2; fi)" ]]
  [[ "$(psql_db -At -c 'SELECT count(*) FROM exam_access_draft.completed_reports')" == "0" ]]
  echo R76_TICKET_ARCHIVE_PG18_BINDING_PASS
fi
WUHAN_TICKET_TEST_ORIGIN="$BASE" WUHAN_TICKET_OWNER_SESSION="$OWNER_TOKEN" WUHAN_TICKET_OTHER_SESSION="$OTHER_TOKEN" \
 WUHAN_TICKET_OWNER_ID="$OWNER_ID" WUHAN_TICKET_OTHER_ID="$OTHER_ID" \
 python3 -B scripts/test_wuhan_research_ticket_http.py
psql_db -c "DO \$\$ BEGIN
 IF (SELECT count(*) FROM exam_access_draft.completed_reports)<>0 THEN RAISE EXCEPTION 'ticket consumed billing'; END IF;
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket WHERE digest !~ '^[0-9a-f]{64}$') THEN RAISE EXCEPTION 'invalid stored digest'; END IF;
 END \$\$" >/dev/null
psql_db -f scripts/test_wuhan_research_ticket_binding.sql >/dev/null
echo WUHAN_RESEARCH_TICKET_BINDING_PG18_PASS
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

REPORT_URL="$BASE/api/platform/research/wuhan/reports/$REPORT_ID"
request 401 "$REPORT_URL"
request 404 -H "Cookie: socthink_parent_session=$OTHER_TOKEN" -H "X-Owner: $OWNER_ID" "$REPORT_URL"
request 200 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$REPORT_URL"
python3 - "$TMP/report.json" "$TMP/response.json" <<'PYREPORT'
import json,sys
a,b=[json.load(open(p)) for p in sys.argv[1:]]
assert a==b and b["billable"] is False and b["total_score"] is None
PYREPORT
request 405 -X POST -H "Cookie: socthink_parent_session=$OWNER_TOKEN" --data '{"billable":true}' "$REPORT_URL"
# Missing values and billable archives fail the SQL CHECK (including NULL).
psql_db <<'SQLREPORT'
DO $$
BEGIN
 BEGIN
  INSERT INTO exam_access_draft.research_report_archive
  SELECT repeat('c',32),owner_id,paper_id,jsonb_set(jsonb_set(payload,'{attempt_id}',to_jsonb(repeat('c',32))),'{billable}','true'),now()
  FROM exam_access_draft.research_report_archive LIMIT 1;
  RAISE EXCEPTION 'billable archive accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO exam_access_draft.research_report_archive
  SELECT repeat('d',32),owner_id,paper_id,jsonb_set(payload,'{attempt_id}',to_jsonb(repeat('d',32)))-'billable',now()
  FROM exam_access_draft.research_report_archive LIMIT 1;
  RAISE EXCEPTION 'missing billable flag accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SQLREPORT
if [[ "${SOCTHINK_TEST_RESEARCH_PAGE:-0}" == "1" || "${SOCTHINK_TEST_R79_LIVE_PAGE:-0}" == "1" ]]; then
  if [[ "${SOCTHINK_TEST_R79_LIVE_PAGE:-0}" == "1" ]]; then
    PAGE_REPORT_ID="$R79_REPORT_ID"
  else
    [[ -n "${WUHAN_SYNTHETIC_REPORT_FIXTURE:-}" ]] || { echo "Synthetic report fixture required"; exit 1; }
    PAGE_REPORT_ID="$REPORT_ID"
  fi
  NEXT_PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
  export SOCTHINK_RUST_COMMERCE_INTERNAL_URL="$BASE"
  setsid node_modules/.bin/next dev --webpack -H 127.0.0.1 -p "$NEXT_PORT" >"$TMP/next.log" 2>&1 &
  NEXT_PID=$!
  for _ in $(seq 1 80); do
    grep -q 'Ready in' "$TMP/next.log" && break
    kill -0 "$NEXT_PID" 2>/dev/null || { tail -30 "$TMP/next.log"; exit 1; }
    sleep 0.25
  done
  URL="http://127.0.0.1:$NEXT_PORT/account/research/wuhan/$PAGE_REPORT_ID"
  curl -fsS --max-time 60 -H "Cookie: socthink_parent_session=$OWNER_TOKEN" "$URL" >"$TMP/page.html" || { tail -30 "$TMP/next.log";exit 1; }
  python3 - "$TMP/page.html" "$TMP/r79-live.json" <<'PYREPORT'
from html.parser import HTMLParser
import sys
class Page(HTMLParser):
 def __init__(self):super().__init__();self.tasks=[];self.content=[];self.review=0;self.skip=False
 def handle_starttag(self,t,a):
  if t in ('script','style'):self.skip=True
  d=dict(a)
  if 'data-report-task' in d:self.tasks.append(d['data-report-task'])
  if t=='details' and d.get('data-review-reference')=='true':self.review+=1
 def handle_endtag(self,t):
  if t in ('script','style'):self.skip=False
 def handle_data(self,d):
  if not self.skip:self.content.append(d)
p=Page();p.feed(open(sys.argv[1]).read());s=' '.join(p.content)
assert len(p.tasks)==18 and len(set(p.tasks))==18,p.tasks
import os
if os.environ.get('SOCTHINK_TEST_R79_LIVE_PAGE')!='1':
 assert '两种识别结果不一致' in s and 'Whisper 文本差异' in s and 'Parakeet 文本差异' in s
assert '内部研究报告' in s and '不扣次' in s
import os
if os.environ.get("SOCTHINK_TEST_MACHINE_PRACTICE_PAGE")=="1":
 assert '听后应答 · 内容练习点' in s
 compact=''.join(s.split())
 assert '2/3' in compact and '明确内容判定：3/7题' in compact,compact[-8000:]
 assert '待核查：1题' in compact and '未提交：2题' in compact and '无有效答音：1题' in compact,compact[-8000:]
 assert '第二识别结果：' in s
 assert '机器内容练习点：0/1' in s
 assert '未识别到有效答音，不计入已判定练习点' in s
 print('WUHAN_MACHINE_PRACTICE_PAGE_RENDER=PASS points 2/3; decided 3/7; no official score')

if os.environ.get("SOCTHINK_TEST_R79_LIVE_PAGE")=="1":
 import json
 r=json.load(open(sys.argv[2]))
 answers=[x for x in r["items"] if x["kind"]=="answer"]
 states=[x["state"] for x in answers]
 assert len(answers)==7 and states.count("reference_match")==1 and states.count("unanswered")==1 and states.count("not_submitted")==4
 assert states.count("known_mismatch")+states.count("needs_review")==1
 decided=1+states.count("known_mismatch")
 uncertain=states.count("needs_review")
 compact=''.join(s.split())
 assert '听后应答·内容练习点' in compact and f'1/{decided}' in compact and f'明确内容判定：{decided}/7题' in compact,compact[-8000:]
 assert f'待核查：{uncertain}题' in compact and '未提交：4题' in compact and '无有效答音：1题' in compact
 assert '机器内容练习点：1/1' in s
 assert ('机器内容练习点：0/1' in s)==bool(states.count("known_mismatch"))
 assert '未识别到有效答音，不计入已判定练习点' in s
 assert p.review==10,p.review
 assert '题后复习' in s and 'Friday morning' in s
 print('R82_FINALIZED_REFERENCE_REVIEW_SSR_PASS 10 oral tasks; frozen bank',flush=True)
 print(f'R79_REAL_SCORER_NEXT_PAGE_PASS 18 tasks; 1/{decided} points; decided {decided}/7; {uncertain} uncertain; 4 unsubmitted; 1 silence; no official grade')
 if os.environ.get("SOCTHINK_TEST_R81_FLUENCY_PAGE")=="1":
  f=next(x for x in r["items"] if x["task_id"]=="read-trees")["candidate"]["diagnosis"]["fluency_evidence"]
  pace=f["recording_words_per_minute"]
  assert '朗读节奏与停顿' in s and ('录音语速：暂不估计' if pace is None else f'录音语速：{pace}词/分钟') in compact
  assert f'有效语音活动：{f["speech_activity_percent"]}%' in compact and f'内部停顿：{f["internal_pause_count"]}次' in compact and '这些测量不是流利度分数' in s
  print('R81_REAL_FLUENCY_NEXT_PAGE_PASS',pace,'WPM;',f["speech_activity_percent"],'% activity;',f["internal_pause_count"],'pauses; no official score')

else:
 print('WUHAN_RESEARCH_PAGE_RENDER=PASS 18 tasks, explicit ASR disagreement and no billing')
PYREPORT
  OTHER_STATUS="$(curl -sS --max-time 45 -o "$TMP/other.html" -w '%{http_code}' -H "Cookie: socthink_parent_session=$OTHER_TOKEN" "$URL")"
  [[ "$OTHER_STATUS" == 404 ]] || { echo "foreign page status=$OTHER_STATUS";exit 1; }
  echo WUHAN_RESEARCH_PAGE_OWNER_SCOPE=PASS
fi
# Prove read-only role cannot mutate archive or access the backing table.
# DDL is rolled back, including the temporary role.
psql_db <<'SQLREPORT'
BEGIN;
CREATE ROLE fixture_wuhan_archive_reader NOLOGIN;
GRANT USAGE ON SCHEMA exam_access_draft TO fixture_wuhan_archive_reader;
GRANT EXECUTE ON FUNCTION exam_access_draft.read_research_report(text,text) TO fixture_wuhan_archive_reader;
SET LOCAL ROLE fixture_wuhan_archive_reader;
DO $$
BEGIN
 BEGIN
  PERFORM payload FROM exam_access_draft.research_report_archive LIMIT 1;
  RAISE EXCEPTION 'reader got raw table access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM exam_access_draft.research_report_archive;
  RAISE EXCEPTION 'reader modified archive';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
SQLREPORT
echo WUHAN_RESEARCH_ARCHIVE_ROLE_ISOLATION=PASS
if [[ "${SOCTHINK_TEST_AUTO_ARCHIVE:-0}" == "1" ]]; then
  ACCENT_ROOT="$WUHAN_ACCENT_RESEARCH_ROOT"
  [[ -f "$ACCENT_ROOT/scripts/evidence_lab/test_wuhan_auto_archive.py" ]] || { echo "Explicit AccentLab research checkout required"; exit 1; }
  python3 scripts/project_wuhan_research_contract.py "$ACCENT_ROOT"
  (cd "$ACCENT_ROOT"; cargo build --locked --offline --example wuhan-oral-preview-api >/dev/null;
   WUHAN_RESEARCH_ARCHIVE_ORIGIN="$BASE" WUHAN_RESEARCH_ARCHIVE_KEY="$SOCTHINK_RESEARCH_ARCHIVE_KEY" \
   WUHAN_RESEARCH_ARCHIVE_OWNER_A="$OWNER_ID" WUHAN_RESEARCH_ARCHIVE_OWNER_B="$OTHER_ID" \
   WUHAN_TEST_OWNER_SESSION="$OWNER_TOKEN" WUHAN_TEST_OTHER_SESSION="$OTHER_TOKEN" \
   python3 -u scripts/evidence_lab/test_wuhan_auto_archive.py)
  [[ "$(psql_db -At -c 'SELECT count(*) FROM exam_access_draft.research_report_archive')" == "$(if [[ "${SOCTHINK_TEST_TICKET_ATTEMPT:-0}" == "1" ]]; then echo 5; else echo 3; fi)" ]]
  [[ "$(psql_db -At -c 'SELECT count(*) FROM exam_access_draft.completed_reports')" == "0" ]]
  echo WUHAN_AUTO_ARCHIVE_NO_BILLING=PASS
fi
echo "WUHAN_RESEARCH_ARCHIVE_SESSION_READ=PASS"
echo "RUST_VOUCHER_API_E2E=PASS auth=verified owner_scope=verified idempotent_claim=PASS cross_account_rejected=PASS refund_revokes_future_access=PASS no_raw_codes=PASS"
