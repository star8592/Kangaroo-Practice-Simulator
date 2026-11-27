#!/usr/bin/env bash
# Own disposable PG18, no external URL accepted, no real report or account.
set -Eeuo pipefail
umask 077
cd "$(dirname "$0")/.."
pg="${PG18_BIN:-/usr/lib/postgresql/18/bin}"
tmp=$(mktemp -d /tmp/wuhan-erasure-ci.XXXXXXXX)
started=0
cleanup(){ if [ "$started" = 1 ]; then "$pg/pg_ctl" -D "$tmp/pg" -m immediate stop >/dev/null 2>&1 || true; fi; rm -rf -- "$tmp"; }
trap cleanup EXIT
openssl rand -hex 24 >"$tmp/password"
"$pg/initdb" -D "$tmp/pg" -A scram-sha-256 --pwfile="$tmp/password" --no-locale >/dev/null
# Private socket directory, no TCP listener. Unique fixture credentials only.
"$pg/pg_ctl" -D "$tmp/pg" -l "$tmp/pg.log" -o "-c listen_addresses='' -c unix_socket_directories=$tmp" -w start >/dev/null
started=1
export PGPASSWORD="$(cat "$tmp/password")"
export PGHOST="$tmp" PGPORT=5432 PGUSER="$(id -un)" PGDATABASE=postgres
unset PGSERVICE PGSERVICEFILE PGOPTIONS
psql_db(){ "$pg/psql" -X -v ON_ERROR_STOP=1 -q "$@"; }
psql_db -c 'CREATE SCHEMA exam_access_draft'
psql_db -f ops/db/drafts/wuhan_research_report_archive.sql
psql_db -f ops/db/drafts/wuhan_research_report_erasure.sql
psql_db <<'SQL'
CREATE ROLE fixture_archive_writer NOLOGIN;
CREATE ROLE fixture_archive_reader NOLOGIN;
CREATE ROLE fixture_archive_eraser NOLOGIN;
GRANT USAGE ON SCHEMA exam_access_draft TO fixture_archive_writer,fixture_archive_reader,fixture_archive_eraser;
GRANT EXECUTE ON FUNCTION exam_access_draft.archive_research_report(text,text,jsonb) TO fixture_archive_writer;
GRANT EXECUTE ON FUNCTION exam_access_draft.read_research_report(text,text) TO fixture_archive_reader;
GRANT EXECUTE ON FUNCTION exam_access_draft.erase_research_report(text,text) TO fixture_archive_eraser;
CREATE FUNCTION public.fixture_payload(r text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('attempt_id',r,'paper_id','WH01','finalized',true,'billable',false,
 'official_score',false,'report_status','research','total_score',NULL,'total_tasks',18,
 'items',(SELECT jsonb_agg(jsonb_build_object('question',i)) FROM generate_series(1,18) i),
 'rubric_sha256',repeat('a',64),'report_evidence_sha256',repeat('b',64))
$$;
DO $$
DECLARE a text:='par_'||repeat('a',16); b text:='par_'||repeat('b',16);
 r text:=repeat('1',32); p jsonb:=public.fixture_payload(r);
BEGIN
 IF exam_access_draft.archive_research_report(a,r,p)<>'archived' THEN RAISE EXCEPTION 'initial archive'; END IF;
 IF exam_access_draft.erase_research_report(b,r)<>'not_found' THEN RAISE EXCEPTION 'cross-owner erasure'; END IF;
 IF exam_access_draft.read_research_report(a,r) IS DISTINCT FROM p THEN RAISE EXCEPTION 'report lost'; END IF;
 IF exam_access_draft.erase_research_report(a,r)<>'erased' THEN RAISE EXCEPTION 'owner erase'; END IF;
 IF exam_access_draft.read_research_report(a,r) IS NOT NULL THEN RAISE EXCEPTION 'report still readable'; END IF;
 IF exam_access_draft.erase_research_report(a,r)<>'not_found' THEN RAISE EXCEPTION 'repeat erase'; END IF;
 IF exam_access_draft.archive_research_report(a,r,p)<>'conflict' THEN RAISE EXCEPTION 'delayed replay'; END IF;
 IF exam_access_draft.archive_research_report(b,r,p)<>'conflict' THEN RAISE EXCEPTION 'reassigned replay'; END IF;
 IF (SELECT count(*) FROM exam_access_draft.research_report_erasure)<>1 THEN RAISE EXCEPTION 'tombstone count'; END IF;
 IF (SELECT count(*) FROM exam_access_draft.research_report_archive)<>0 THEN RAISE EXCEPTION 'payload resurrected'; END IF;
 IF exam_access_draft.erase_research_report(a,repeat('9',32))<>'not_found' THEN RAISE EXCEPTION 'unknown'; END IF;
 IF (SELECT count(*) FROM exam_access_draft.research_report_erasure)<>1 THEN RAISE EXCEPTION 'preemptive denial'; END IF;
 IF has_function_privilege('fixture_archive_writer','exam_access_draft.erase_research_report(text,text)','EXECUTE')
 OR has_function_privilege('fixture_archive_reader','exam_access_draft.erase_research_report(text,text)','EXECUTE')
 OR has_function_privilege('fixture_archive_eraser','exam_access_draft.archive_research_report(text,text,jsonb)','EXECUTE')
 OR has_table_privilege('fixture_archive_eraser','exam_access_draft.research_report_archive','DELETE')
 OR has_table_privilege('fixture_archive_writer','exam_access_draft.research_report_erasure','DELETE')
 OR has_table_privilege('fixture_archive_reader','exam_access_draft.research_report_erasure','SELECT')
 THEN RAISE EXCEPTION 'role separation'; END IF;
END $$;
-- Erase in one transaction; a concurrent late writer waits for the same lock.
SELECT exam_access_draft.archive_research_report('par_'||repeat('a',16),repeat('2',32),public.fixture_payload(repeat('2',32)));
SQL
(
 psql_db -At <<'SQL'
BEGIN;
SELECT exam_access_draft.erase_research_report('par_'||repeat('a',16),repeat('2',32));
SELECT pg_sleep(1.5);
COMMIT;
SQL
) >"$tmp/eraser.log" &
epid=$!
# Confirm the eraser holds its advisory lock before sending the competing call.
for i in $(seq 1 40); do
 if [ "$(psql_db -At -c "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted")" = 1 ]; then break; fi
 sleep .05
done
test "$(psql_db -At -c "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted")" = 1
result=$(psql_db -At -c "SELECT exam_access_draft.archive_research_report('par_'||repeat('a',16),repeat('2',32),public.fixture_payload(repeat('2',32)))")
wait "$epid"
test "$result" = conflict
test "$(psql_db -At -c "SELECT count(*) FROM exam_access_draft.research_report_archive")" = 0
test "$(psql_db -At -c "SELECT count(*) FROM exam_access_draft.research_report_erasure")" = 2
echo WUHAN_RESEARCH_ERASURE_PG18_PASS owner_scope replay concurrent_replay role_isolation minimal_tombstone
