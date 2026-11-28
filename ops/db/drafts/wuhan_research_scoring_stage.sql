-- Isolated candidate: separate encrypted staging, no public role grants.
BEGIN;
CREATE TABLE exam_access_draft.research_scoring_consent(
 attempt_id text PRIMARY KEY REFERENCES exam_access_draft.research_attempt_ticket(attempt_id),
 session_version bigint NOT NULL,
 notice_version text NOT NULL CHECK(notice_version='wuhan-recording-v1'),
 granted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 revoked_at timestamptz
);
CREATE TABLE exam_access_draft.research_scoring_stage(
 attempt_id text PRIMARY KEY REFERENCES exam_access_draft.research_scoring_job(attempt_id),
 ciphertext bytea NOT NULL CHECK(octet_length(ciphertext) BETWEEN 29 AND 28000000),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '30 minutes'
);
REVOKE ALL ON exam_access_draft.research_scoring_consent,exam_access_draft.research_scoring_stage FROM PUBLIC;
-- Only a trusted authenticated server after explicit, scoped confirmation may call.
CREATE FUNCTION exam_access_draft.grant_scoring_consent(a text,r text,v bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('research-scoring-admission',0));
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket
 WHERE attempt_id=r AND owner_id=a AND session_version=v AND claimed_at IS NOT NULL AND session_expires_at>clock_timestamp())
 OR EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure WHERE attempt_id=r) THEN RETURN false; END IF;
 INSERT INTO exam_access_draft.research_scoring_consent(attempt_id,session_version,notice_version)
 VALUES(r,v,'wuhan-recording-v1') ON CONFLICT DO NOTHING;
 RETURN EXISTS(SELECT 1 FROM exam_access_draft.research_scoring_consent WHERE attempt_id=r AND session_version=v AND revoked_at IS NULL);
END $$;
CREATE FUNCTION exam_access_draft.stage_research_scoring(a text,r text,p text,h text,c bytea)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE result text;
BEGIN
 IF c IS NULL OR octet_length(c) NOT BETWEEN 29 AND 28000000 THEN RETURN 'invalid'; END IF;
 -- Match enqueue lock ordering.
 PERFORM pg_advisory_xact_lock(hashtextextended('research-scoring-admission',0));
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.research_scoring_consent g
 JOIN exam_access_draft.research_attempt_ticket t USING(attempt_id)
 WHERE g.attempt_id=r AND t.owner_id=a AND t.paper_id=p AND g.session_version=t.session_version
 AND g.revoked_at IS NULL AND t.session_expires_at>clock_timestamp()) THEN RETURN 'consent_required'; END IF;
 result:=exam_access_draft.enqueue_research_scoring(a,r,p,h);
 IF result='queued' THEN
  INSERT INTO exam_access_draft.research_scoring_stage(attempt_id,ciphertext) VALUES(r,c);
 ELSIF result='already_queued' AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_scoring_stage WHERE attempt_id=r AND expires_at>clock_timestamp()) THEN
  IF EXISTS(SELECT 1 FROM exam_access_draft.research_scoring_job WHERE attempt_id=r AND state='completed') THEN RETURN 'already_completed'; END IF;
  RETURN 'stage_unavailable';
 END IF;
 RETURN result;
END $$;
-- Returns only for an active lease, current account binding, unrevoked consent.
CREATE FUNCTION exam_access_draft.load_research_scoring(r text,l uuid)
RETURNS TABLE(owner_id text,paper_id text,session_version bigint,manifest_sha256 text,ciphertext bytea)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT t.owner_id,t.paper_id,t.session_version,q.manifest_sha256,s.ciphertext
 FROM exam_access_draft.research_scoring_job q JOIN exam_access_draft.research_attempt_ticket t USING(attempt_id)
 JOIN exam_access_draft.research_scoring_consent g USING(attempt_id) JOIN exam_access_draft.research_scoring_stage s USING(attempt_id)
 WHERE q.attempt_id=r AND q.state='leased' AND q.lease_id=l AND q.lease_until>statement_timestamp()
 AND t.session_expires_at>statement_timestamp() AND g.revoked_at IS NULL AND g.session_version=t.session_version
 AND s.expires_at>statement_timestamp()
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=r)
$$;
CREATE FUNCTION exam_access_draft.revoke_scoring_consent(a text,r text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket WHERE attempt_id=r AND owner_id=a) THEN RETURN false; END IF;
 UPDATE exam_access_draft.research_scoring_consent SET revoked_at=clock_timestamp() WHERE attempt_id=r AND revoked_at IS NULL;
 DELETE FROM exam_access_draft.research_scoring_stage WHERE attempt_id=r;
 UPDATE exam_access_draft.research_scoring_job SET state='failed',lease_id=NULL,lease_until=NULL WHERE attempt_id=r AND state IN ('queued','leased');
 RETURN true;
END $$;
CREATE FUNCTION exam_access_draft.cleanup_scoring_stage()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE n integer;
BEGIN
 UPDATE exam_access_draft.research_scoring_job q SET state='failed',lease_id=NULL,lease_until=NULL
 FROM exam_access_draft.research_scoring_stage s
 WHERE s.attempt_id=q.attempt_id AND q.state IN ('queued','leased')
 AND (s.expires_at<=clock_timestamp() OR (q.state='leased' AND q.tries>=3 AND q.lease_until<=clock_timestamp()));
 DELETE FROM exam_access_draft.research_scoring_stage s USING exam_access_draft.research_scoring_job q
 WHERE s.attempt_id=q.attempt_id AND (s.expires_at<=clock_timestamp() OR q.state IN ('completed','failed')
 OR (q.state='leased' AND q.tries>=3 AND q.lease_until<=clock_timestamp())
 OR EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=s.attempt_id));
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION exam_access_draft.grant_scoring_consent(text,text,bigint),exam_access_draft.stage_research_scoring(text,text,text,text,bytea),exam_access_draft.load_research_scoring(text,uuid),exam_access_draft.revoke_scoring_consent(text,text),exam_access_draft.cleanup_scoring_stage() FROM PUBLIC;
-- Safe authorization probe without copying the ciphertext into worker memory again.
CREATE FUNCTION exam_access_draft.inspect_scoring_stage_access(r text,l uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM exam_access_draft.load_research_scoring(r,l))
$$;
REVOKE ALL ON FUNCTION exam_access_draft.inspect_scoring_stage_access(text,uuid) FROM PUBLIC;
-- Replace completion only in the stage-enabled isolated candidate schema.
CREATE OR REPLACE FUNCTION exam_access_draft.complete_research_scoring(a text,r text,l uuid,h text,p jsonb)
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
 -- For staged jobs, consent and ciphertext must remain available until commit.
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_scoring_consent WHERE attempt_id=r)
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.load_research_scoring(r,l))
 THEN RETURN 'not_available'; END IF;
 -- Do not accept pre-existing reports outside this fenced operation.
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_report_archive WHERE attempt_id=r)
 THEN RETURN 'archive_conflict'; END IF;
 -- The claimed owner/paper and current lease have already been checked above.
 outcome:=exam_access_draft.archive_research_report(a,r,p);
 IF outcome<>'archived' THEN RETURN outcome; END IF;
 UPDATE exam_access_draft.research_scoring_job SET state='completed',lease_id=NULL,lease_until=NULL,
 available_at=clock_timestamp() WHERE attempt_id=r;
 DELETE FROM exam_access_draft.research_scoring_stage WHERE attempt_id=r;
 RETURN 'completed';
END $$;
REVOKE ALL ON FUNCTION exam_access_draft.complete_research_scoring(text,text,uuid,text,jsonb) FROM PUBLIC;
COMMIT;
