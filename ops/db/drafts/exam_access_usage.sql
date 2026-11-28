-- Isolated candidate only, not installed by production migration runner.
-- One source order, one entitlement; same grant model for direct checkout or voucher.
BEGIN;
CREATE SCHEMA IF NOT EXISTS exam_access_draft;
CREATE TABLE IF NOT EXISTS exam_access_draft.grants(
 source_order_id text PRIMARY KEY REFERENCES public.billing_orders(id),
 owner_id text NOT NULL CHECK(owner_id ~ '^par_[a-zA-Z0-9_]+$'),
 exam_key text NOT NULL CHECK(length(exam_key) BETWEEN 1 AND 128),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000),
 used integer NOT NULL DEFAULT 0 CHECK(used>=0 AND used<=capacity),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS exam_access_draft.completed_reports(
 owner_id text NOT NULL,
 exam_key text NOT NULL,
 report_id text NOT NULL CHECK(length(report_id) BETWEEN 1 AND 128),
 source_order_id text NOT NULL REFERENCES exam_access_draft.grants(source_order_id),
 committed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,exam_key,report_id)
);
-- Caller is a trusted scoring service with an authenticated account and
-- a persisted successful report. No client-supplied success flags.
-- Payment order lock is always acquired BEFORE grant lock; refund uses same order.
CREATE OR REPLACE FUNCTION exam_access_draft.consume_report(a text,e text,r text)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE g exam_access_draft.grants%ROWTYPE;
 DECLARE o_state text;
 DECLARE o_owner text;
 BEGIN
 IF a IS NULL OR a !~ '^par_[a-zA-Z0-9_]+$' OR e IS NULL OR length(e) NOT BETWEEN 1 AND 128 OR r IS NULL OR length(r) NOT BETWEEN 1 AND 128 THEN
  RAISE EXCEPTION 'invalid report scope';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(jsonb_build_array(a,e)::text,9824));
 IF EXISTS(SELECT 1 FROM exam_access_draft.completed_reports WHERE (owner_id,exam_key,report_id)=(a,e,r)) THEN RETURN 'already_consumed'; END IF;
 FOR g IN SELECT x.* FROM exam_access_draft.grants x JOIN public.billing_orders o ON o.id=x.source_order_id
 WHERE x.owner_id=a AND x.exam_key=e AND x.revoked_at IS NULL AND x.expires_at>clock_timestamp()
 AND x.used<x.capacity AND o.state='paid' AND o.payer_parent_id=a
 ORDER BY x.expires_at,x.source_order_id
 LOOP
  SELECT state,payer_parent_id INTO o_state,o_owner FROM public.billing_orders WHERE id=g.source_order_id FOR UPDATE;
  IF o_state<>'paid' OR o_owner<>a THEN CONTINUE; END IF;
  UPDATE exam_access_draft.grants SET used=used+1 WHERE source_order_id=g.source_order_id
   AND owner_id=a AND revoked_at IS NULL AND expires_at>clock_timestamp() AND used<capacity;
  IF FOUND THEN
   INSERT INTO exam_access_draft.completed_reports(owner_id,exam_key,report_id,source_order_id) VALUES(a,e,r,g.source_order_id);
   RETURN 'consumed';
  END IF;
 END LOOP;
 RETURN 'no_entitlement';
 END;
$$;
CREATE OR REPLACE VIEW exam_access_draft.active_grants AS
 SELECT g.source_order_id,g.owner_id,g.exam_key,g.capacity,g.used,g.capacity-g.used AS remaining,g.expires_at
 FROM exam_access_draft.grants g JOIN public.billing_orders o ON o.id=g.source_order_id
 WHERE o.state='paid' AND o.payer_parent_id=g.owner_id AND g.revoked_at IS NULL AND g.expires_at>now();
REVOKE ALL ON SCHEMA exam_access_draft FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA exam_access_draft FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA exam_access_draft FROM PUBLIC;
COMMIT;
