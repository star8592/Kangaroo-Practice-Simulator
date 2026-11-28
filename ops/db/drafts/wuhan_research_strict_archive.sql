-- Strict research ingestion: all newly accepted reports must have a claimed
-- server-issued attempt. Legacy ingestion remains a separate fixture function.
BEGIN;
CREATE FUNCTION exam_access_draft.archive_claimed_research_report(a text,r text,p jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 IF a IS NULL OR r IS NULL OR p IS NULL OR r !~ '^[0-9a-f]{32}$'
 OR a !~ '^par_[0-9a-f]{16,48}$' THEN RETURN 'invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 -- Lock the binding against concurrent modification/deletion. Original login
 -- expiry does not invalidate a legitimately finalized pending report.
 PERFORM 1 FROM exam_access_draft.research_attempt_ticket
 WHERE attempt_id=r AND owner_id=a AND paper_id=p->>'paper_id' AND claimed_at IS NOT NULL
 FOR SHARE;
 IF NOT FOUND THEN RETURN 'conflict'; END IF;
 RETURN exam_access_draft.archive_research_report(a,r,p);
END $$;
REVOKE ALL ON FUNCTION exam_access_draft.archive_claimed_research_report(text,text,jsonb) FROM PUBLIC;
COMMIT;
