-- Research-only candidate. Explicit verified owner request, no automatic TTL.
-- Never grant this function to the archive writer, reader or billing consumer.
BEGIN;
CREATE TABLE exam_access_draft.research_report_erasure(
 attempt_id text PRIMARY KEY CHECK(attempt_id ~ '^[0-9a-f]{32}$'),
 erased_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON exam_access_draft.research_report_erasure FROM PUBLIC;
CREATE FUNCTION exam_access_draft.erase_research_report(a text,r text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 IF a IS NULL OR r IS NULL OR a !~ '^par_[0-9a-f]{16,48}$' OR r !~ '^[0-9a-f]{32}$' THEN
  RETURN 'not_found';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 DELETE FROM exam_access_draft.research_report_archive WHERE attempt_id=r AND owner_id=a;
 IF NOT FOUND THEN RETURN 'not_found'; END IF;
 -- Keep only the opaque attempt identifier and erasure time to block delayed
 -- deliveries. No account, payload, text, rubric or audio in the tombstone.
 INSERT INTO exam_access_draft.research_report_erasure(attempt_id) VALUES(r);
 RETURN 'erased';
END;
$$;
REVOKE ALL ON FUNCTION exam_access_draft.erase_research_report(text,text) FROM PUBLIC;
CREATE OR REPLACE FUNCTION exam_access_draft.archive_research_report(a text,r text,p jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE existing exam_access_draft.research_report_archive%ROWTYPE;
BEGIN
 IF a IS NULL OR r IS NULL OR p IS NULL THEN RETURN 'invalid'; END IF;
 IF r !~ '^[0-9a-f]{32}$' OR a !~ '^par_[0-9a-f]{16,48}$' THEN RETURN 'invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure WHERE attempt_id=r) THEN
  RETURN 'conflict';
 END IF;
 SELECT * INTO existing FROM exam_access_draft.research_report_archive WHERE attempt_id=r;
 IF FOUND THEN
  IF existing.owner_id=a AND existing.payload=p THEN RETURN 'already_archived'; END IF;
  RETURN 'conflict';
 END IF;
 BEGIN
  INSERT INTO exam_access_draft.research_report_archive(attempt_id,owner_id,paper_id,payload)
  VALUES(r,a,p->>'paper_id',p);
 EXCEPTION WHEN check_violation OR not_null_violation THEN RETURN 'invalid';
 END;
 RETURN 'archived';
END;
$$;
REVOKE ALL ON FUNCTION exam_access_draft.archive_research_report(text,text,jsonb) FROM PUBLIC;
COMMIT;
