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
