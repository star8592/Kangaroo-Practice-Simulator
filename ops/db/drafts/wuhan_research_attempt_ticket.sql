-- Isolated research identity handoff. No billing, consent or production grant.
BEGIN;
CREATE TABLE exam_access_draft.research_attempt_ticket(
 digest text PRIMARY KEY CHECK(digest ~ '^[0-9a-f]{64}$'),
 attempt_id text NOT NULL UNIQUE CHECK(attempt_id ~ '^[0-9a-f]{32}$'),
 owner_id text NOT NULL CHECK(owner_id ~ '^par_[0-9a-f]{16,48}$'),
 session_version bigint NOT NULL CHECK(session_version>0),
 paper_id text NOT NULL CHECK(paper_id ~ '^WH(0[1-9]|10)$'),
 expires_at timestamptz NOT NULL,
 claimed_at timestamptz
);
REVOKE ALL ON exam_access_draft.research_attempt_ticket FROM PUBLIC;
CREATE FUNCTION exam_access_draft.issue_research_ticket(a text,v bigint,p text,session_exp bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE t text; r text; e timestamptz;
BEGIN
 IF a IS NULL OR v IS NULL OR p IS NULL OR session_exp IS NULL OR session_exp<=extract(epoch FROM clock_timestamp()) OR session_exp>253402300799 OR a !~ '^par_[0-9a-f]{16,48}$'
 OR v<1 OR p !~ '^WH(0[1-9]|10)$' THEN RETURN NULL; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('research-ticket-owner:'||a,0));
 -- Bound pending grants in this isolated preview, not a purchase entitlement.
 IF (SELECT count(*) FROM exam_access_draft.research_attempt_ticket
     WHERE owner_id=a AND claimed_at IS NULL AND expires_at>clock_timestamp())>=4 THEN RETURN NULL; END IF;
 t:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 r:=replace(gen_random_uuid()::text,'-','');
 e:=least(clock_timestamp()+interval '120 seconds',to_timestamp(session_exp));
 INSERT INTO exam_access_draft.research_attempt_ticket(digest,attempt_id,owner_id,session_version,paper_id,expires_at)
 VALUES(encode(sha256(convert_to(t,'UTF8')),'hex'),r,a,v,p,e);
 RETURN jsonb_build_object('ticket',t,'attempt_id',r,'paper_id',p,'expires_in',greatest(0,floor(extract(epoch FROM (e-clock_timestamp())))::int),'billable',false);
END $$;
CREATE FUNCTION exam_access_draft.inspect_research_ticket(t text,p text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT jsonb_build_object('owner_id',owner_id,'session_version',session_version)
 FROM exam_access_draft.research_attempt_ticket
 WHERE t ~ '^[0-9a-f]{64}$' AND digest=encode(sha256(convert_to(t,'UTF8')),'hex')
 AND paper_id=p AND claimed_at IS NULL AND expires_at>statement_timestamp()
$$;
CREATE FUNCTION exam_access_draft.claim_research_ticket(t text,p text,a text,v bigint)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 UPDATE exam_access_draft.research_attempt_ticket SET claimed_at=clock_timestamp()
 WHERE t ~ '^[0-9a-f]{64}$' AND digest=encode(sha256(convert_to(t,'UTF8')),'hex')
 AND paper_id=p AND owner_id=a AND session_version=v AND claimed_at IS NULL AND expires_at>clock_timestamp()
 RETURNING jsonb_build_object('attempt_id',attempt_id,'owner_id',owner_id,'paper_id',paper_id,'billable',false)
$$;
REVOKE ALL ON FUNCTION exam_access_draft.issue_research_ticket(text,bigint,text,bigint),
 exam_access_draft.inspect_research_ticket(text,text),
 exam_access_draft.claim_research_ticket(text,text,text,bigint) FROM PUBLIC;
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
 -- If this ID was issued by the account service, only its claimed owner
 -- and exact paper can archive. Legacy synthetic R74 IDs are still allowed
 -- in this isolated preview; production must require the claimed binding.
 IF EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket WHERE attempt_id=r)
 AND NOT EXISTS(SELECT 1 FROM exam_access_draft.research_attempt_ticket
 WHERE attempt_id=r AND owner_id=a AND paper_id=p->>'paper_id' AND claimed_at IS NOT NULL) THEN
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
