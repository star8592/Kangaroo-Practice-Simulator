#!/usr/bin/env bash
set -euo pipefail
# A fresh local cluster with no network listener or customer data.
cd "$(dirname "$0")/.."
pgbin="${PG18_BIN:-/usr/lib/postgresql/18/bin}"
tmp="$(mktemp -d /tmp/soc-voucher-ci.XXXXXX)"
trap '"$pgbin/pg_ctl" -D "$tmp/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$tmp"' EXIT
"$pgbin/initdb" -D "$tmp/db" -A trust --no-locale >/dev/null
"$pgbin/pg_ctl" -D "$tmp/db" -l "$tmp/log" -o "-c listen_addresses= -c unix_socket_directories=$tmp -p 55481" -w start >/dev/null
p(){ "$pgbin/psql" -X -qAt -v ON_ERROR_STOP=1 -h "$tmp" -p 55481 -d postgres "$@"; }
p -f ops/db/drafts/channel_voucher_receipt_projection.sql
p -f ops/db/drafts/channel_voucher_receipt_projection.sql
issue(){ p -c "SELECT voucher_draft.issue('xiaohongshu','shop','line',$1,'wh-standard','wuhan-2027',30,now()::date+interval '2 days',repeat('$2',64),repeat('f',64),now())"; }
claim(){ p -c "SELECT voucher_draft.claim(repeat('$1',64),'$2')"; }
refund(){ p -c "SELECT voucher_draft.refund('xiaohongshu','shop','line',$1,repeat('e',64),now())"; }
[[ "$(issue 0 a)" == issued ]]
[[ "$(issue 0 a)" == already_issued ]]
[[ "$(issue 1 b)" == issued ]]
claim a par_one > "$tmp/a" & x=$!
claim a par_two > "$tmp/b" & y=$!
wait "$x"; wait "$y"
[[ "$(cat "$tmp/a" "$tmp/b" | sort | tr '\n' ' ')" == "claimed unavailable " ]]
owner=$(p -c "SELECT owner_id FROM voucher_draft.active_grants WHERE unit_index=0")
[[ "$(claim a "$owner")" == already_claimed ]]
[[ "$(p -c 'SELECT count(*) FROM voucher_draft.active_grants')" == 1 ]]
[[ "$(refund 0)" == revoked ]]
[[ "$(claim a "$owner")" == unavailable ]]
[[ "$(p -c 'SELECT count(*) FROM voucher_draft.active_grants')" == 0 ]]
[[ "$(refund 2)" == revoked ]]
[[ "$(issue 2 c)" == refunded ]]
[[ "$(issue 0 a)" == refunded ]]
claim b par_three > "$tmp/c" & x=$!
refund 1 > "$tmp/d" & y=$!
wait "$x"; wait "$y"
[[ "$(p -c 'SELECT count(*) FROM voucher_draft.active_grants')" == 0 ]]
[[ "$(claim b par_three)" == unavailable ]]
[[ "$(p -c "SELECT count(*) FROM voucher_draft.units WHERE unit_index=2")" == 0 ]]
[[ "$(p -c 'SELECT count(*) FROM voucher_draft.units WHERE revoked_at IS NOT NULL')" == 2 ]]
echo 'VOUCHER_PG18_DRAFT=PASS: idempotent issue, concurrent claim, refund-before-issue, concurrent refund, no active revoked grant'
