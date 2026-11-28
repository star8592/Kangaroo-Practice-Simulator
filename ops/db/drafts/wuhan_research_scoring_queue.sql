-- Candidate only. Metadata, no recordings, no score, no new public grants.
BEGIN;
CREATE TABLE exam_access_draft.research_scoring_job(
 attempt_id text PRIMARY KEY REFERENCES exam_access_draft.research_attempt_ticket(attempt_id),
 manifest_sha256 text NOT NULL CHECK(manifest_sha256 ~ '^[0-9a-f]{64}$'),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','leased','completed','failed')),
 tries integer NOT NULL DEFAULT 0 CHECK(tries BETWEEN 0 AND 3),
 available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_id uuid,
 lease_until timestamptz,
 CHECK((state='leased')=(lease_id IS NOT NULL AND lease_until IS NOT NULL)),
 CHECK(state='leased' OR (lease_id IS NULL AND lease_until IS NULL))
);
CREATE INDEX research_scoring_job_ready ON exam_access_draft.research_scoring_job(available_at,attempt_id)
 WHERE state IN ('queued','leased');
REVOKE ALL ON exam_access_draft.research_scoring_job FROM PUBLIC;
-- Caller must separately verify live account, guardian consent, and authorized staging.
CREATE FUNCTION exam_access_draft.enqueue_research_scoring(a text,r text,p text,h text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE old_hash text;
BEGIN
 IF h IS NULL OR h !~ '^[0-9a-f]{64}$' OR a IS NULL OR r IS NULL OR p IS NULL THEN RETURN 'invalid'; END IF;
 -- Serialize only enqueue admission, not inference or report generation.
 PERFORM pg_advisory_xact_lock(hashtextextended('research-scoring-admission',0));
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket t
 WHERE t.attempt_id=r AND t.owner_id=a AND t.paper_id=p AND t.claimed_at IS NOT NULL
 AND t.session_expires_at>clock_timestamp())
 OR EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure WHERE attempt_id=r)
 THEN RETURN 'not_available'; END IF;
 SELECT manifest_sha256 INTO old_hash FROM exam_access_draft.research_scoring_job WHERE attempt_id=r;
 IF FOUND THEN RETURN CASE WHEN old_hash=h THEN 'already_queued' ELSE 'conflict' END; END IF;
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_report_archive WHERE attempt_id=r)
 THEN RETURN 'already_archived'; END IF;
 -- Count only actionable jobs. Proposed pilot ceilings, not measured capacity.
 IF (SELECT count(*) FROM exam_access_draft.research_scoring_job q
 JOIN exam_access_draft.research_attempt_ticket t ON t.attempt_id=q.attempt_id
 WHERE q.state IN ('queued','leased') AND (q.tries<3 OR q.lease_until>clock_timestamp())
 AND t.session_expires_at>clock_timestamp()
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=q.attempt_id))>=32
 THEN RETURN 'queue_full'; END IF;
 IF (SELECT count(*) FROM exam_access_draft.research_scoring_job q
 JOIN exam_access_draft.research_attempt_ticket t ON t.attempt_id=q.attempt_id
 WHERE t.owner_id=a AND q.state IN ('queued','leased') AND (q.tries<3 OR q.lease_until>clock_timestamp())
 AND t.session_expires_at>clock_timestamp()
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=q.attempt_id))>=2
 THEN RETURN 'owner_limit'; END IF;
 INSERT INTO exam_access_draft.research_scoring_job(attempt_id,manifest_sha256) VALUES(r,h);
 RETURN 'queued';
END $$;
-- Lease is bounded; worker must revalidate owner/session/consent before loading audio.
CREATE FUNCTION exam_access_draft.claim_research_scoring()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j exam_access_draft.research_scoring_job%ROWTYPE; token uuid;
BEGIN
 SELECT q.* INTO j FROM exam_access_draft.research_scoring_job q
 JOIN exam_access_draft.research_attempt_ticket t ON t.attempt_id=q.attempt_id
 WHERE q.tries<3 AND ((q.state='queued' AND q.available_at<=clock_timestamp())
 OR (q.state='leased' AND q.lease_until<=clock_timestamp()))
 AND t.claimed_at IS NOT NULL AND t.session_expires_at>clock_timestamp()
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=q.attempt_id)
 ORDER BY q.available_at,q.attempt_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 token:=gen_random_uuid();
 UPDATE exam_access_draft.research_scoring_job SET state='leased',tries=tries+1,
 lease_id=token,lease_until=clock_timestamp()+interval '5 minutes' WHERE attempt_id=j.attempt_id;
 RETURN jsonb_build_object('attempt_id',j.attempt_id,'manifest_sha256',j.manifest_sha256,'lease_id',token,'try',j.tries+1);
END $$;
-- Retry only; successful completion must atomically archive under its current lease.
CREATE FUNCTION exam_access_draft.finish_research_scoring(r text,l uuid,success boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j exam_access_draft.research_scoring_job%ROWTYPE; next_state text;
BEGIN
 IF r IS NULL OR l IS NULL OR success IS NULL THEN RETURN 'invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 SELECT * INTO j FROM exam_access_draft.research_scoring_job WHERE attempt_id=r FOR UPDATE;
 IF NOT FOUND OR j.state<>'leased' OR j.lease_id<>l OR j.lease_until<=clock_timestamp()
 THEN RETURN 'stale_lease'; END IF;
 IF success THEN RETURN 'atomic_archive_required'; END IF;
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure WHERE attempt_id=r)
 THEN next_state:='failed';
 ELSE next_state:=CASE WHEN j.tries>=3 THEN 'failed' ELSE 'queued' END;
 END IF;
 UPDATE exam_access_draft.research_scoring_job SET state=next_state,lease_id=NULL,lease_until=NULL,
 available_at=clock_timestamp()+CASE WHEN next_state='queued' THEN interval '30 seconds' ELSE interval '0 seconds' END
 WHERE attempt_id=r;
 RETURN next_state;
END $$;
-- Grant this only to the authenticated evidence-validated archive worker.
-- Manifest digest is a binding supplied by that trusted worker, not a client score.
CREATE FUNCTION exam_access_draft.complete_research_scoring(a text,r text,l uuid,h text,p jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j exam_access_draft.research_scoring_job%ROWTYPE; outcome text;
BEGIN
 IF a IS NULL OR r IS NULL OR l IS NULL OR h IS NULL OR p IS NULL THEN RETURN 'invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 SELECT * INTO j FROM exam_access_draft.research_scoring_job WHERE attempt_id=r FOR UPDATE;
 IF NOT FOUND OR j.state<>'leased' OR j.lease_id<>l OR j.lease_until<=clock_timestamp()
 THEN RETURN 'stale_lease'; END IF;
 IF j.manifest_sha256<>h THEN RETURN 'manifest_conflict'; END IF;
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket t
 WHERE t.attempt_id=r AND t.owner_id=a AND t.paper_id=p->>'paper_id'
 AND t.claimed_at IS NOT NULL AND t.session_expires_at>clock_timestamp())
 OR EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure WHERE attempt_id=r)
 THEN RETURN 'not_available'; END IF;
 -- Do not accept pre-existing reports outside this fenced operation.
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_report_archive WHERE attempt_id=r)
 THEN RETURN 'archive_conflict'; END IF;
 -- The claimed owner/paper and current lease have already been checked above.
 outcome:=exam_access_draft.archive_research_report(a,r,p);
 IF outcome<>'archived' THEN RETURN outcome; END IF;
 UPDATE exam_access_draft.research_scoring_job SET state='completed',lease_id=NULL,lease_until=NULL,
 available_at=clock_timestamp() WHERE attempt_id=r;
 RETURN 'completed';
END $$;
REVOKE ALL ON FUNCTION exam_access_draft.complete_research_scoring(text,text,uuid,text,jsonb) FROM PUBLIC;
-- Existing synchronous archive endpoint must not bypass a queued job.
-- Both paths share the same attempt lock. Legacy fixture-only grant must stay disabled.
CREATE OR REPLACE FUNCTION exam_access_draft.archive_claimed_research_report(a text,r text,p jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 IF a IS NULL OR r IS NULL OR p IS NULL OR r !~ '^[0-9a-f]{32}$'
 OR a !~ '^par_[0-9a-f]{16,48}$' THEN RETURN 'invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_scoring_job WHERE attempt_id=r)
 THEN RETURN 'conflict'; END IF;
 PERFORM 1 FROM exam_access_draft.research_attempt_ticket
 WHERE attempt_id=r AND owner_id=a AND paper_id=p->>'paper_id' AND claimed_at IS NOT NULL
 FOR SHARE;
 IF NOT FOUND THEN RETURN 'conflict'; END IF;
 RETURN exam_access_draft.archive_research_report(a,r,p);
END $$;
REVOKE ALL ON FUNCTION exam_access_draft.archive_claimed_research_report(text,text,jsonb) FROM PUBLIC;
-- Read only after server-side identity and current consent verification.
-- Do not leave a user in an eternal running state after exhausted lease/session.
CREATE FUNCTION exam_access_draft.read_research_scoring(a text,r text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT jsonb_build_object('attempt_id',q.attempt_id,'state',
 CASE WHEN q.state IN ('queued','leased') AND t.session_expires_at<=statement_timestamp() THEN 'failed'
 WHEN q.state='leased' AND q.lease_until<=statement_timestamp() AND q.tries>=3 THEN 'failed'
 WHEN q.state='leased' AND q.lease_until<=statement_timestamp() THEN 'queued'
 ELSE q.state END)
 FROM exam_access_draft.research_scoring_job q
 JOIN exam_access_draft.research_attempt_ticket t ON t.attempt_id=q.attempt_id
 WHERE q.attempt_id=r AND t.owner_id=a AND t.claimed_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=r)
$$;
REVOKE ALL ON FUNCTION exam_access_draft.read_research_scoring(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION exam_access_draft.enqueue_research_scoring(text,text,text,text),
 exam_access_draft.claim_research_scoring(),exam_access_draft.finish_research_scoring(text,uuid,boolean) FROM PUBLIC;
COMMIT;
