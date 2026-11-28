-- R93 candidate, apply after scoring_stage on an independent scoring database.
BEGIN;
ALTER TABLE exam_access_draft.research_scoring_job ADD COLUMN lease_started_at timestamptz;
-- Runtime only: claim exclusively staged, consented jobs.
CREATE OR REPLACE FUNCTION exam_access_draft.claim_research_scoring()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE j exam_access_draft.research_scoring_job%ROWTYPE; token uuid; now_at timestamptz;
BEGIN
 SELECT q.* INTO j FROM exam_access_draft.research_scoring_job q
 JOIN exam_access_draft.research_attempt_ticket t USING(attempt_id)
 JOIN exam_access_draft.research_scoring_consent g USING(attempt_id)
 JOIN exam_access_draft.research_scoring_stage s USING(attempt_id)
 WHERE q.tries<3 AND ((q.state='queued' AND q.available_at<=clock_timestamp())
 OR (q.state='leased' AND q.lease_until<=clock_timestamp()))
 AND t.claimed_at IS NOT NULL AND t.session_expires_at>clock_timestamp()
 AND g.revoked_at IS NULL AND g.session_version=t.session_version AND s.expires_at>clock_timestamp()
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=q.attempt_id)
 ORDER BY q.available_at,q.attempt_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 token:=gen_random_uuid(); now_at:=clock_timestamp();
 UPDATE exam_access_draft.research_scoring_job SET state='leased',tries=tries+1,
 lease_id=token,lease_started_at=now_at,lease_until=now_at+interval '5 minutes' WHERE attempt_id=j.attempt_id;
 RETURN jsonb_build_object('attempt_id',j.attempt_id,'manifest_sha256',j.manifest_sha256,'lease_id',token,'try',j.tries+1);
END $$;
CREATE FUNCTION exam_access_draft.renew_scoring_lease(r text,l uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE now_at timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 now_at:=clock_timestamp();
 UPDATE exam_access_draft.research_scoring_job q
 SET lease_until=least(now_at+interval '5 minutes',q.lease_started_at+interval '10 minutes',s.expires_at,t.session_expires_at)
 FROM exam_access_draft.research_scoring_stage s,exam_access_draft.research_attempt_ticket t,exam_access_draft.research_scoring_consent g
 WHERE q.attempt_id=r AND q.state='leased' AND q.lease_id=l AND q.lease_until>now_at
 AND q.lease_started_at+interval '10 minutes'>now_at
 AND s.attempt_id=r AND s.expires_at>now_at AND t.attempt_id=r AND t.session_expires_at>now_at
 AND g.attempt_id=r AND g.revoked_at IS NULL AND g.session_version=t.session_version
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=r);
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION exam_access_draft.renew_scoring_lease(text,uuid) FROM PUBLIC;
-- Same lock order as completion/revocation: attempt lock, queue row, stage row.
CREATE OR REPLACE FUNCTION exam_access_draft.cleanup_scoring_stage()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE r text; n integer:=0; removed integer;
BEGIN
 FOR r IN SELECT s.attempt_id FROM exam_access_draft.research_scoring_stage s JOIN exam_access_draft.research_scoring_job q USING(attempt_id)
 JOIN exam_access_draft.research_attempt_ticket t USING(attempt_id)
 WHERE s.expires_at<=clock_timestamp() OR t.session_expires_at<=clock_timestamp() OR q.state IN ('completed','failed')
 OR (q.state='leased' AND q.tries>=3 AND q.lease_until<=clock_timestamp())
 OR EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=s.attempt_id)
 ORDER BY s.attempt_id LIMIT 32
 LOOP
  IF NOT pg_try_advisory_xact_lock(hashtextextended('research-report:'||r,0)) THEN CONTINUE; END IF;
  UPDATE exam_access_draft.research_scoring_job q SET state='failed',lease_id=NULL,lease_until=NULL
  FROM exam_access_draft.research_scoring_stage s,exam_access_draft.research_attempt_ticket t
  WHERE q.attempt_id=r AND s.attempt_id=r AND t.attempt_id=r AND q.state IN ('queued','leased')
  AND (s.expires_at<=clock_timestamp() OR t.session_expires_at<=clock_timestamp()
  OR (q.state='leased' AND q.tries>=3 AND q.lease_until<=clock_timestamp())
  OR EXISTS(SELECT 1 FROM exam_access_draft.research_report_erasure e WHERE e.attempt_id=r));
  DELETE FROM exam_access_draft.research_scoring_stage s USING exam_access_draft.research_scoring_job q
  WHERE s.attempt_id=r AND q.attempt_id=r AND q.state IN ('completed','failed');
  GET DIAGNOSTICS removed=ROW_COUNT; n:=n+removed;
 END LOOP;
 RETURN n;
END $$;
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
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.load_research_scoring(r,l))
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
CREATE OR REPLACE FUNCTION exam_access_draft.revoke_scoring_consent(a text,r text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('research-report:'||r,0));
 IF NOT EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket WHERE attempt_id=r AND owner_id=a) THEN RETURN false; END IF;
 UPDATE exam_access_draft.research_scoring_consent SET revoked_at=clock_timestamp() WHERE attempt_id=r AND revoked_at IS NULL;
 UPDATE exam_access_draft.research_scoring_job SET state='failed',lease_id=NULL,lease_until=NULL WHERE attempt_id=r AND state IN ('queued','leased');
 DELETE FROM exam_access_draft.research_scoring_stage WHERE attempt_id=r;
 RETURN true;
END $$;
COMMIT;
