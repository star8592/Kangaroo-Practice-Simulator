-- Execute as owner of an independent scoring schema. Roles precreated NOLOGIN.
BEGIN;
REVOKE ALL ON SCHEMA exam_access_draft FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA exam_access_draft FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA exam_access_draft FROM PUBLIC;
GRANT USAGE ON SCHEMA exam_access_draft TO wuhan_scoring_ingress,wuhan_scoring_worker,wuhan_scoring_archive,wuhan_scoring_reader;
GRANT EXECUTE ON FUNCTION exam_access_draft.issue_research_ticket(text,bigint,text,bigint),
 exam_access_draft.claim_research_ticket(text,text,text,bigint),
 exam_access_draft.inspect_research_attempt_access(text,text,text),
 exam_access_draft.grant_scoring_consent(text,text,bigint),
 exam_access_draft.stage_research_scoring(text,text,text,text,bytea),
 exam_access_draft.revoke_scoring_consent(text,text)
 TO wuhan_scoring_ingress;
GRANT EXECUTE ON FUNCTION exam_access_draft.claim_research_scoring(),
 exam_access_draft.load_research_scoring(text,uuid),
 exam_access_draft.renew_scoring_lease(text,uuid),
 exam_access_draft.finish_research_scoring(text,uuid,boolean),
 exam_access_draft.cleanup_scoring_stage() TO wuhan_scoring_worker;
GRANT EXECUTE ON FUNCTION exam_access_draft.inspect_research_attempt_access(text,text,text),
 exam_access_draft.complete_research_scoring(text,text,uuid,text,jsonb) TO wuhan_scoring_archive;
GRANT EXECUTE ON FUNCTION exam_access_draft.read_research_report(text,text),
 exam_access_draft.read_research_scoring(text,text) TO wuhan_scoring_reader;
COMMIT;
