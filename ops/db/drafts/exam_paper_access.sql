-- Isolated draft: registry must be populated only from verified production paper receipts.
BEGIN;
CREATE TABLE IF NOT EXISTS exam_access_draft.paper_registry(
 exam_key text NOT NULL,
 paper_id text NOT NULL,
 verified boolean NOT NULL DEFAULT false,
 available boolean NOT NULL DEFAULT false,
 PRIMARY KEY(exam_key,paper_id)
);
-- Fixed five-paper bundle, immutable once associated with a product revision.
-- Actual identifiers and coverage must be audited before publishing.
CREATE TABLE IF NOT EXISTS exam_access_draft.basic_papers(
 exam_key text NOT NULL,
 paper_id text NOT NULL,
 PRIMARY KEY(exam_key,paper_id),
 FOREIGN KEY(exam_key,paper_id) REFERENCES exam_access_draft.paper_registry(exam_key,paper_id)
);
CREATE OR REPLACE FUNCTION exam_access_draft.guard_basic_bundle()
 RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE scope text;
 BEGIN
 scope:=CASE WHEN TG_OP='INSERT' THEN NEW.exam_key ELSE OLD.exam_key END;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope,5438));
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'basic bundle entries are immutable'; END IF;
 IF EXISTS(SELECT 1 FROM public.billing_orders o JOIN exam_access_draft.order_terms t ON t.source_order_id=o.id
 WHERE o.content_id=scope AND t.paper_access='five_verified_papers')
 OR EXISTS(SELECT 1 FROM voucher_draft.units u JOIN voucher_draft.order_receipts r USING(channel,merchant_id,order_line_id,unit_index)
 WHERE u.content_id=scope AND r.paper_access='five_verified_papers') THEN RAISE EXCEPTION 'basic bundle already sold'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF (SELECT count(*) FROM exam_access_draft.basic_papers WHERE exam_key=scope)>=5 THEN RAISE EXCEPTION 'basic bundle full'; END IF;
 RETURN NEW;
 END;
$$;
DROP TRIGGER IF EXISTS guard_basic_bundle ON exam_access_draft.basic_papers;
CREATE TRIGGER guard_basic_bundle BEFORE INSERT OR UPDATE OR DELETE ON exam_access_draft.basic_papers
 FOR EACH ROW EXECUTE FUNCTION exam_access_draft.guard_basic_bundle();
CREATE OR REPLACE FUNCTION exam_access_draft.can_open_paper(a text,e text,p text)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(
 SELECT 1 FROM exam_access_draft.active_grants g
 JOIN exam_access_draft.order_terms t ON t.source_order_id=g.source_order_id
 JOIN exam_access_draft.paper_registry r ON r.exam_key=g.exam_key AND r.paper_id=p
 WHERE g.owner_id=a AND g.exam_key=e AND r.verified AND r.available
 AND (t.paper_access='all_verified_papers_and_updates'
 OR (t.paper_access='five_verified_papers' AND EXISTS(
 SELECT 1 FROM exam_access_draft.basic_papers b WHERE b.exam_key=e AND b.paper_id=p)
 AND (SELECT count(*) FROM exam_access_draft.basic_papers b WHERE b.exam_key=e)=5))
 );
$$;
-- Paper-aware debit: trusted scorer only, never a public client success flag.
ALTER TABLE exam_access_draft.completed_reports ADD COLUMN IF NOT EXISTS paper_id text;
DROP FUNCTION IF EXISTS exam_access_draft.consume_report(text,text,text);
CREATE OR REPLACE FUNCTION exam_access_draft.consume_report(a text,e text,p text,r text)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE g exam_access_draft.grants%ROWTYPE;
 DECLARE o_state text;
 DECLARE o_owner text;
 DECLARE previous_paper text;
 BEGIN
 IF a IS NULL OR a !~ '^par_[a-zA-Z0-9_]+$' OR e IS NULL OR length(e) NOT BETWEEN 1 AND 128 OR p IS NULL OR length(p) NOT BETWEEN 1 AND 128 OR r IS NULL OR length(r) NOT BETWEEN 1 AND 128 THEN
  RAISE EXCEPTION 'invalid report scope';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(jsonb_build_array(a,e)::text,9824));
 SELECT paper_id INTO previous_paper FROM exam_access_draft.completed_reports WHERE (owner_id,exam_key,report_id)=(a,e,r);
 IF FOUND THEN
  IF previous_paper=p THEN RETURN 'already_consumed'; END IF;
  RETURN 'report_scope_conflict';
 END IF;
 PERFORM 1 FROM exam_access_draft.paper_registry WHERE (exam_key,paper_id)=(e,p) AND verified AND available FOR SHARE;
 IF NOT FOUND THEN RETURN 'paper_unavailable'; END IF;
 FOR g IN SELECT x.* FROM exam_access_draft.grants x JOIN public.billing_orders o ON o.id=x.source_order_id
 JOIN exam_access_draft.order_terms t ON t.source_order_id=x.source_order_id
 WHERE x.owner_id=a AND x.exam_key=e AND x.revoked_at IS NULL AND x.expires_at>clock_timestamp()
 AND x.used<x.capacity AND o.state='paid' AND o.payer_parent_id=a
 AND (t.paper_access='all_verified_papers_and_updates' OR (t.paper_access='five_verified_papers' AND EXISTS(SELECT 1 FROM exam_access_draft.basic_papers b WHERE b.exam_key=e AND b.paper_id=p) AND (SELECT count(*) FROM exam_access_draft.basic_papers b WHERE b.exam_key=e)=5))
 ORDER BY CASE WHEN t.paper_access='five_verified_papers' THEN 0 ELSE 1 END,x.expires_at,x.source_order_id
 LOOP
  SELECT state,payer_parent_id INTO o_state,o_owner FROM public.billing_orders WHERE id=g.source_order_id FOR UPDATE;
  IF o_state IS DISTINCT FROM 'paid' OR o_owner IS DISTINCT FROM a THEN CONTINUE; END IF;
  UPDATE exam_access_draft.grants SET used=used+1 WHERE source_order_id=g.source_order_id
   AND owner_id=a AND revoked_at IS NULL AND expires_at>clock_timestamp() AND used<capacity;
  IF FOUND THEN
   INSERT INTO exam_access_draft.completed_reports(owner_id,exam_key,report_id,source_order_id,paper_id) VALUES(a,e,r,g.source_order_id,p);
   RETURN 'consumed';
  END IF;
 END LOOP;
 RETURN 'no_entitlement';
 END;
$$;
REVOKE ALL ON ALL TABLES IN SCHEMA exam_access_draft FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA exam_access_draft FROM PUBLIC;
COMMIT;
