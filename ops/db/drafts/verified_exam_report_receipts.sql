-- Isolated contract only. Trusted scorer must derive verified status from
-- server-issued attempt, authoritative answers and completed scoring evidence.
-- Research candidates cannot authorize paid usage. Do not deploy this draft
-- or grant the scorer role to a browser-facing database user.
BEGIN;
CREATE TABLE IF NOT EXISTS exam_access_draft.verified_report_receipts(
 report_id text PRIMARY KEY CHECK(length(report_id) BETWEEN 1 AND 128),
 owner_id text NOT NULL CHECK(owner_id ~ '^par_[a-zA-Z0-9_]+$'),
 exam_key text NOT NULL CHECK(exam_key = 'wuhan-2027'),
 paper_id text NOT NULL,
 attempt_id text NOT NULL UNIQUE CHECK(length(attempt_id) BETWEEN 1 AND 128),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[0-9a-f]{64}$'),
 status text NOT NULL CHECK(status IN ('research','failed','verified')),
 expected_tasks int NOT NULL CHECK(expected_tasks BETWEEN 1 AND 100),
 accounted_tasks int NOT NULL CHECK(accounted_tasks BETWEEN 0 AND expected_tasks),
 valid_oral_results int NOT NULL CHECK(valid_oral_results BETWEEN 0 AND accounted_tasks),
 finalized_at timestamptz NOT NULL,
 CHECK(status <> 'verified' OR (expected_tasks=18 AND accounted_tasks=expected_tasks AND valid_oral_results>0)),
 FOREIGN KEY(exam_key,paper_id) REFERENCES exam_access_draft.paper_registry(exam_key,paper_id)
);
-- The receipt writer must be a dedicated authenticated internal service role.
-- The consumer never creates receipts and only receives an authenticated owner.
CREATE OR REPLACE FUNCTION exam_access_draft.consume_verified_report(a text,e text,p text,r text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 DECLARE receipt exam_access_draft.verified_report_receipts%ROWTYPE;
 BEGIN
 IF a IS NULL OR e IS NULL OR p IS NULL OR r IS NULL THEN RETURN 'report_scope_conflict'; END IF;
 SELECT * INTO receipt FROM exam_access_draft.verified_report_receipts WHERE report_id=r FOR SHARE;
 IF NOT FOUND THEN RETURN 'no_verified_report'; END IF;
 IF (receipt.owner_id,receipt.exam_key,receipt.paper_id) IS DISTINCT FROM (a,e,p) THEN RETURN 'report_scope_conflict'; END IF;
 IF receipt.status<>'verified' OR receipt.accounted_tasks<>receipt.expected_tasks OR receipt.valid_oral_results=0 THEN
  RETURN 'report_not_billable';
 END IF;
 RETURN exam_access_draft.consume_report(a,e,p,r);
 END;
$$;
REVOKE ALL ON exam_access_draft.verified_report_receipts FROM PUBLIC;
REVOKE ALL ON FUNCTION exam_access_draft.consume_verified_report(text,text,text,text) FROM PUBLIC;
COMMIT;
