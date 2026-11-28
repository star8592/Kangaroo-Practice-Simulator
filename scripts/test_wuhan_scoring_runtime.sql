-- Isolated database only, use synthetic entries and roll back.
CREATE ROLE wuhan_scoring_ingress NOLOGIN;
CREATE ROLE wuhan_scoring_worker NOLOGIN;
CREATE ROLE wuhan_scoring_archive NOLOGIN;
CREATE ROLE wuhan_scoring_reader NOLOGIN;
\ir ../ops/db/drafts/wuhan_research_scoring_roles.sql
-- Role script commits; the disposable DB is deleted by shell harness.
DO $$
DECLARE a text:='par_1111111111111111'; t jsonb; r text; j jsonb; l uuid; v text; n integer;
BEGIN
 t:=exam_access_draft.issue_research_ticket(a,1,'WH01',extract(epoch FROM clock_timestamp()+interval '1 hour')::bigint);
 r:=t->>'attempt_id';
 PERFORM exam_access_draft.claim_research_ticket(t->>'ticket','WH01',a,1);
 IF NOT exam_access_draft.grant_scoring_consent(a,r,1) THEN RAISE EXCEPTION 'consent'; END IF;
 v:=exam_access_draft.stage_research_scoring(a,r,'WH01',repeat('a',64),decode(repeat('00',29),'hex'));
 IF v<>'queued' THEN RAISE EXCEPTION 'stage %',v; END IF;
 j:=exam_access_draft.claim_research_scoring();l:=(j->>'lease_id')::uuid;
 IF j->>'attempt_id'<>r OR NOT exam_access_draft.renew_scoring_lease(r,l) THEN RAISE EXCEPTION 'lease'; END IF;
 IF exam_access_draft.renew_scoring_lease(r,gen_random_uuid()) THEN RAISE EXCEPTION 'wrong lease'; END IF;
 UPDATE exam_access_draft.research_scoring_job SET lease_started_at=clock_timestamp()-interval '11 minutes' WHERE attempt_id=r;
 IF exam_access_draft.renew_scoring_lease(r,l) THEN RAISE EXCEPTION 'renewed after hard limit'; END IF;
 UPDATE exam_access_draft.research_scoring_stage SET expires_at=clock_timestamp()-interval '1 second' WHERE attempt_id=r;
 n:=exam_access_draft.cleanup_scoring_stage();
 IF n<>1 OR (SELECT state FROM exam_access_draft.research_scoring_job WHERE attempt_id=r)<>'failed' THEN RAISE EXCEPTION 'expired cleanup'; END IF;
END $$;
DO $$
BEGIN
 IF has_table_privilege('wuhan_scoring_worker','exam_access_draft.research_scoring_stage','SELECT') OR
 has_function_privilege('wuhan_scoring_worker','exam_access_draft.complete_research_scoring(text,text,uuid,text,jsonb)','EXECUTE') OR
 has_function_privilege('wuhan_scoring_ingress','exam_access_draft.load_research_scoring(text,uuid)','EXECUTE') OR
 has_function_privilege('wuhan_scoring_archive','exam_access_draft.archive_research_report(text,text,jsonb)','EXECUTE') OR
 has_function_privilege('wuhan_scoring_reader','exam_access_draft.claim_research_scoring()','EXECUTE') THEN RAISE EXCEPTION 'role bypass'; END IF;
 IF NOT has_function_privilege('wuhan_scoring_worker','exam_access_draft.renew_scoring_lease(text,uuid)','EXECUTE') OR
 NOT has_function_privilege('wuhan_scoring_archive','exam_access_draft.complete_research_scoring(text,text,uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'missing role grant'; END IF;
END $$;
SELECT 'R93_RUNTIME_LEASE_ROLE_CLEANUP_PASS';
