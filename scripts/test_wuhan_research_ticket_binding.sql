-- Executed only by test_rust_voucher_api.sh against a disposable CI database.
BEGIN;
CREATE ROLE fixture_ticket_issuer NOLOGIN;
CREATE ROLE fixture_ticket_claimer NOLOGIN;
CREATE ROLE fixture_strict_archive_writer NOLOGIN;
GRANT USAGE ON SCHEMA exam_access_draft TO fixture_strict_archive_writer;
GRANT EXECUTE ON FUNCTION exam_access_draft.archive_claimed_research_report(text,text,jsonb) TO fixture_strict_archive_writer;
GRANT USAGE ON SCHEMA exam_access_draft TO fixture_ticket_issuer,fixture_ticket_claimer;
GRANT EXECUTE ON FUNCTION exam_access_draft.issue_research_ticket(text,bigint,text,bigint) TO fixture_ticket_issuer;
GRANT EXECUTE ON FUNCTION exam_access_draft.inspect_research_ticket(text,text),
 exam_access_draft.claim_research_ticket(text,text,text,bigint) TO fixture_ticket_claimer;
DO $$
DECLARE a text:='par_'||repeat('c',16); b text:='par_'||repeat('d',16);
 t jsonb; r text; p jsonb; raw text; claimed jsonb;
BEGIN
 IF has_function_privilege('fixture_ticket_issuer','exam_access_draft.claim_research_ticket(text,text,text,bigint)','EXECUTE')
 OR has_function_privilege('fixture_ticket_claimer','exam_access_draft.issue_research_ticket(text,bigint,text,bigint)','EXECUTE')
 OR has_function_privilege('fixture_ticket_claimer','exam_access_draft.archive_research_report(text,text,jsonb)','EXECUTE')
 OR has_table_privilege('fixture_ticket_issuer','exam_access_draft.research_attempt_ticket','SELECT')
 OR has_table_privilege('fixture_ticket_claimer','exam_access_draft.research_attempt_ticket','UPDATE')
 THEN RAISE EXCEPTION 'ticket role isolation'; END IF;
 t:=exam_access_draft.issue_research_ticket(a,1,'WH01',extract(epoch FROM clock_timestamp()+interval '1 hour')::bigint);
 r:=t->>'attempt_id';raw:=t->>'ticket';
 IF r IS NULL OR raw IS NULL THEN RAISE EXCEPTION 'fixture ticket missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket WHERE attempt_id=r AND digest=encode(sha256(convert_to(raw,'UTF8')),'hex') AND digest<>raw) THEN
 RAISE EXCEPTION 'ticket digest mismatch'; END IF;
 p:=jsonb_build_object('attempt_id',r,'paper_id','WH01','finalized',true,'billable',false,
 'official_score',false,'report_status','research','total_score',NULL,'total_tasks',18,
 'items',(SELECT jsonb_agg(jsonb_build_object('question',i)) FROM generate_series(1,18) i),
 'rubric_sha256',repeat('a',64),'report_evidence_sha256',repeat('b',64));
 IF exam_access_draft.archive_research_report(a,r,p)<>'conflict' THEN RAISE EXCEPTION 'unclaimed archive'; END IF;
 IF has_function_privilege('fixture_strict_archive_writer','exam_access_draft.archive_research_report(text,text,jsonb)','EXECUTE')
 OR has_table_privilege('fixture_strict_archive_writer','exam_access_draft.research_report_archive','INSERT')
 THEN RAISE EXCEPTION 'legacy writer privilege leak'; END IF;
 IF exam_access_draft.archive_claimed_research_report(a,repeat('e',32),jsonb_set(p,'{attempt_id}',to_jsonb(repeat('e',32))))<>'conflict'
 OR exam_access_draft.archive_claimed_research_report(a,r,p)<>'conflict' THEN RAISE EXCEPTION 'strict unbound archive'; END IF;
 claimed:=exam_access_draft.claim_research_ticket(raw,'WH01',a,1);
 IF claimed->>'attempt_id' IS DISTINCT FROM r THEN RAISE EXCEPTION 'claim'; END IF;
 IF exam_access_draft.archive_research_report(b,r,p)<>'conflict' THEN RAISE EXCEPTION 'wrong owner archive'; END IF;
 IF exam_access_draft.archive_research_report(a,r,jsonb_set(p,'{paper_id}','"WH02"'))<>'conflict' THEN RAISE EXCEPTION 'wrong paper archive'; END IF;
 IF exam_access_draft.archive_claimed_research_report(a,r,p)<>'archived' THEN RAISE EXCEPTION 'strict bound archive'; END IF;
 IF exam_access_draft.archive_research_report(a,r,p)<>'already_archived' THEN RAISE EXCEPTION 'bound retry'; END IF;
 IF exam_access_draft.erase_research_report(a,r)<>'erased' THEN RAISE EXCEPTION 'bound erase'; END IF;
 IF exam_access_draft.archive_research_report(a,r,p)<>'conflict' THEN RAISE EXCEPTION 'bound resurrection'; END IF;
 IF exam_access_draft.archive_claimed_research_report(a,r,p)<>'conflict' THEN RAISE EXCEPTION 'strict resurrection'; END IF;
END $$;
-- Never leave synthetic bindings or roles in the fixture.
ROLLBACK;
