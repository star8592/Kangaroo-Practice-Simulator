#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pgbin="${PG18_BIN:-/usr/lib/postgresql/18/bin}"
tmp="$(mktemp -d /tmp/soc-exam-access-ci.XXXXXX)"
trap '"$pgbin/pg_ctl" -D "$tmp/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$tmp"' EXIT
"$pgbin/initdb" -D "$tmp/db" -A trust --no-locale >/dev/null
"$pgbin/pg_ctl" -D "$tmp/db" -l "$tmp/log" -o "-c listen_addresses= -c unix_socket_directories=$tmp -p 55482" -w start >/dev/null
p(){ "$pgbin/psql" -X -qAt -v ON_ERROR_STOP=1 -h "$tmp" -p 55482 -d postgres "$@"; }
p -f ops/db/001_billing_entitlements.sql
p -f ops/db/drafts/exam_access_usage.sql
p -f ops/db/drafts/exam_access_usage.sql
# Synthetic order fixtures use existing schema, not new sellable products.
p -c "INSERT INTO billing_products(id,tier,period,amount_minor,currency) VALUES('fixture','plus','month',3990,'CNY');
INSERT INTO billing_orders(id,payer_parent_id,product_id,price_minor,currency,provider,state) VALUES
 ('a','par_one','fixture',3990,'CNY','fixture','paid'),
 ('b','par_one','fixture',3990,'CNY','fixture','pending'),
 ('c','par_one','fixture',3990,'CNY','fixture','paid'),
 ('d','par_two','fixture',3990,'CNY','fixture','paid');
INSERT INTO exam_access_draft.grants(source_order_id,owner_id,exam_key,capacity,expires_at) VALUES
 ('a','par_one','wuhan-2027',1,now()+interval '1 day'),
 ('b','par_one','wuhan-2027',100,now()+interval '1 day'),
 ('c','par_one','wuhan-2027',1,now()+interval '2 day'),
 ('d','par_two','wuhan-2027',1,now()-interval '1 day');"
consume(){ p -c "SELECT exam_access_draft.consume_report('$1','$2','$3')"; }
[[ "$(consume par_two wuhan-2027 r1)" == no_entitlement ]]
[[ "$(consume par_one beijing-2027 r1)" == no_entitlement ]]
consume par_one wuhan-2027 r1 > "$tmp/a" & x=$!
consume par_one wuhan-2027 r1 > "$tmp/b" & y=$!
wait "$x"; wait "$y"
[[ "$(cat "$tmp/a" "$tmp/b" | sort | tr '\n' ' ')" == "already_consumed consumed " ]]
[[ "$(p -c "SELECT used FROM exam_access_draft.grants WHERE source_order_id='a'")" == 1 ]]
consume par_one wuhan-2027 r2 > "$tmp/c" & x=$!
consume par_one wuhan-2027 r3 > "$tmp/d" & y=$!
wait "$x"; wait "$y"
[[ "$(cat "$tmp/c" "$tmp/d" | sort | tr '\n' ' ')" == "consumed no_entitlement " ]]
[[ "$(p -c "SELECT used FROM exam_access_draft.grants WHERE source_order_id='b'")" == 0 ]]
p -c "UPDATE billing_orders SET state='refunded' WHERE id IN ('a','c');"
[[ "$(p -c "SELECT count(*) FROM exam_access_draft.active_grants")" == 0 ]]
[[ "$(consume par_one wuhan-2027 r4)" == no_entitlement ]]
[[ "$(p -c "SELECT count(*) FROM exam_access_draft.completed_reports")" == 2 ]]
echo 'EXAM_ACCESS_PG18_DRAFT=PASS: paid-order FK, account/region isolation, idempotent concurrent report use, quota limits, refund history'
