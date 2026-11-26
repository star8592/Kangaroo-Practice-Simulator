#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pgbin="${PG18_BIN:-/usr/lib/postgresql/18/bin}"
tmp="$(mktemp -d /tmp/soc-channel-bridge-ci.XXXXXX)"
trap '"$pgbin/pg_ctl" -D "$tmp/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$tmp"' EXIT
"$pgbin/initdb" -D "$tmp/db" -A trust --no-locale >/dev/null
"$pgbin/pg_ctl" -D "$tmp/db" -l "$tmp/log" -o "-c listen_addresses= -c unix_socket_directories=$tmp -p 55483" -w start >/dev/null
p(){ "$pgbin/psql" -X -qAt -v ON_ERROR_STOP=1 -h "$tmp" -p 55483 -d postgres "$@"; }
for f in ops/db/00*.sql ops/db/010*.sql ops/db/011*.sql; do p -f "$f" >/dev/null; done
p -c 'CREATE ROLE socthink_billing NOLOGIN;'
p -f ops/db/015_platform_organization_seats.sql >/dev/null
p -f ops/db/drafts/channel_voucher_receipt_projection.sql
p -f ops/db/drafts/exam_access_usage.sql
p -f ops/db/drafts/channel_exam_bridge.sql
p -f ops/db/drafts/channel_exam_bridge.sql
p -c "INSERT INTO billing_products(id,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled,rights_approved,delivery_verified,access_restricted) VALUES
('wh-standard','exam_access','exam_access','wuhan-2027','fixture',3990,'CNY',true,true,true,true);
INSERT INTO exam_access_draft.offer_terms VALUES('wh-standard',30,now()+interval '2 days','all_verified_papers_and_updates');
INSERT INTO voucher_draft.channel_mapping SELECT 'xiaohongshu','shop','sku-1',product_id,capacity,expires_at,true FROM exam_access_draft.offer_terms;"
issue(){ p -c "SELECT voucher_draft.issue_exam('xiaohongshu','shop','line',$1,'sku-1','actual-fixture-tx',${3:-3990},'CNY',repeat('$2',64),repeat('f',64),now())"; }
claim(){ p -c "SELECT voucher_draft.claim_exam(repeat('$1',64),'$2')"; }
refund(){ p -c "SELECT voucher_draft.refund_exam('xiaohongshu','shop','line',$1,repeat('e',64),now())"; }
[[ "$(issue 0 a)" == issued ]]
[[ "$(issue 0 a)" == already_issued ]]
if issue 1 b 1 >/dev/null 2>&1; then exit 1; fi
[[ "$(issue 1 b)" == issued ]]
[[ "$(p -c 'SELECT count(*) FROM billing_orders')" == 0 ]]
claim a par_one > "$tmp/a" & x=$!
claim a par_two > "$tmp/b" & y=$!
wait "$x"; wait "$y"
[[ "$(cat "$tmp/a" "$tmp/b" | sort | tr '\n' ' ')" == "claimed unavailable " ]]
owner=$(p -c "SELECT payer_parent_id FROM billing_orders")
[[ "$(claim a "$owner")" == already_claimed ]]
[[ "$(p -c "SELECT count(*) FROM billing_orders WHERE state='paid' AND price_minor=3990 AND provider='xiaohongshu'")" == 1 ]]
[[ "$(p -c "SELECT exam_access_draft.consume_report('$owner','wuhan-2027','report-1')")" == consumed ]]
[[ "$(claim b par_three)" == claimed ]]
[[ "$(refund 0)" == revoked ]]
[[ "$(refund 0)" == revoked ]]
[[ "$(p -c 'SELECT count(*) FROM exam_access_draft.active_grants')" == 1 ]]
[[ "$(p -c "SELECT count(*) FROM billing_payment_events WHERE event_kind='refunded'")" == 1 ]]
[[ "$(p -c 'SELECT count(*) FROM exam_access_draft.completed_reports')" == 1 ]]
[[ "$(refund 2)" == revoked ]]
[[ "$(issue 2 c)" == refunded ]]
[[ "$(p -c 'SELECT count(*) FROM billing_orders')" == 2 ]]
[[ "$(p -c "SELECT exam_access_draft.consume_report('par_three','wuhan-2027','report-2')")" == consumed ]]
echo 'CHANNEL_EXAM_BRIDGE_PG18=PASS'
