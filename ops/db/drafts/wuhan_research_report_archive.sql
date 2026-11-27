-- Research archive only. No grants, paid receipts, or student audio.
BEGIN;
CREATE TABLE exam_access_draft.research_report_archive(
 attempt_id text PRIMARY KEY CHECK(attempt_id ~ '^[0-9a-f]{32}$'),
 owner_id text NOT NULL CHECK(owner_id ~ '^par_[0-9a-f]{16,48}$'),
 paper_id text NOT NULL CHECK(paper_id ~ '^WH(0[1-9]|10)$'),
 payload jsonb NOT NULL,
 stored_at timestamptz NOT NULL DEFAULT now(),
 CHECK(octet_length(payload::text)<=262144),
 CHECK((payload->>'attempt_id'=attempt_id AND payload->>'paper_id'=paper_id
   AND payload->'finalized'='true'::jsonb
   AND payload->'billable'='false'::jsonb
   AND payload->'official_score'='false'::jsonb
   AND payload->>'report_status'='research'
   AND payload->'total_score'='null'::jsonb
   AND payload->'total_tasks'='18'::jsonb
   AND jsonb_typeof(payload->'items')='array'
   AND jsonb_array_length(payload->'items')=18
   AND payload->>'rubric_sha256' ~ '^[0-9a-f]{64}$'
   AND payload->>'report_evidence_sha256' ~ '^[0-9a-f]{64}$') IS TRUE)
);
REVOKE ALL ON exam_access_draft.research_report_archive FROM PUBLIC;
-- Only the internal archive writer may insert; API uses this owner-scoped read.
-- The owner argument must come from the server's authenticated session.
CREATE FUNCTION exam_access_draft.read_research_report(a text,r text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT payload FROM exam_access_draft.research_report_archive
 WHERE owner_id=a AND attempt_id=r
$$;
REVOKE ALL ON FUNCTION exam_access_draft.read_research_report(text,text) FROM PUBLIC;
COMMIT;

-- Immutable, idempotent research ingestion. This is an internal-only contract.
BEGIN;
CREATE FUNCTION exam_access_draft.archive_research_report(a text,r text,p jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE existing exam_access_draft.research_report_archive%ROWTYPE;
BEGIN
 IF a IS NULL OR r IS NULL OR p IS NULL THEN RETURN 'invalid'; END IF;
 IF r !~ '^[0-9a-f]{32}$' OR a !~ '^par_[0-9a-f]{16,48}$' THEN RETURN 'invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
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
