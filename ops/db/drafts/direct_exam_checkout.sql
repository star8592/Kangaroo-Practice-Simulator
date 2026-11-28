-- Candidate only. Apply after channel_exam_bridge.sql.
BEGIN;
-- Unique pending slot across both exam cards; not a prohibition on repeat purchases.
CREATE UNIQUE INDEX IF NOT EXISTS billing_exam_draft_one_pending ON public.billing_orders(payer_parent_id,content_id)
 WHERE product_kind='exam_access' AND state='pending';
-- Store immutable entitlement terms in the same transaction as the existing
-- central order. Caller has already verified the authenticated purchaser.
CREATE OR REPLACE FUNCTION exam_access_draft.create_direct_order(oid text,a text,pid text,provider_id text,policy text,accepted timestamptz)
 RETURNS bigint LANGUAGE plpgsql AS $$
 DECLARE p public.billing_products%ROWTYPE;
 DECLARE terms exam_access_draft.offer_terms%ROWTYPE;
 BEGIN
 IF a IS NULL OR a !~ '^par_[a-zA-Z0-9_]+$' OR provider_id IS DISTINCT FROM 'wechat_native' OR policy IS NULL OR accepted IS NULL THEN RAISE EXCEPTION 'invalid exam checkout scope'; END IF;
 SELECT * INTO p FROM public.billing_products WHERE id=pid AND enabled AND product_kind='exam_access' AND content_kind='exam_access' AND rights_approved AND delivery_verified AND access_restricted FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'exam product unavailable'; END IF;
 SELECT * INTO terms FROM exam_access_draft.offer_terms WHERE product_id=pid FOR SHARE;
 IF NOT FOUND OR terms.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'exam terms unavailable'; END IF;
 IF terms.paper_access='five_verified_papers' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(p.content_id,5438));
  IF (SELECT count(*) FROM exam_access_draft.basic_papers b JOIN exam_access_draft.paper_registry r USING(exam_key,paper_id) WHERE b.exam_key=p.content_id AND r.verified AND r.available)<>5 THEN RAISE EXCEPTION 'basic bundle not ready'; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(jsonb_build_array(a,p.content_id)::text,9134));
 IF EXISTS(SELECT 1 FROM public.billing_orders WHERE payer_parent_id=a AND content_id=p.content_id AND product_kind='exam_access' AND state='pending') THEN RAISE EXCEPTION 'exam payment already pending'; END IF;
 INSERT INTO public.billing_orders(id,payer_parent_id,product_id,price_minor,currency,provider,product_kind,content_kind,content_id,title_snapshot,sales_policy_version,sales_policy_accepted_at)
 VALUES(oid,a,p.id,p.amount_minor,p.currency,provider_id,'exam_access','exam_access',p.content_id,p.title_zh,policy,accepted);
 INSERT INTO exam_access_draft.order_terms VALUES(oid,terms.capacity,terms.expires_at,terms.paper_access);
 RETURN p.amount_minor;
 END;
$$;
-- Called only inside the existing verified settlement transaction, after the
-- central order was marked paid and its payment event was inserted.
CREATE OR REPLACE FUNCTION exam_access_draft.grant_paid_direct_order(oid text)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE o public.billing_orders%ROWTYPE;
 DECLARE t exam_access_draft.order_terms%ROWTYPE;
 BEGIN
 SELECT * INTO o FROM public.billing_orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND OR o.state<>'paid' OR o.provider<>'wechat_native' OR o.product_kind<>'exam_access' THEN RAISE EXCEPTION 'not verified paid exam order'; END IF;
 SELECT * INTO t FROM exam_access_draft.order_terms WHERE source_order_id=oid;
 IF NOT FOUND THEN RAISE EXCEPTION 'exam order missing terms'; END IF;
 INSERT INTO exam_access_draft.grants(source_order_id,owner_id,exam_key,capacity,expires_at)
 VALUES(oid,o.payer_parent_id,o.content_id,t.capacity,t.expires_at) ON CONFLICT DO NOTHING;
 RETURN oid;
 END;
$$;
REVOKE ALL ON ALL TABLES IN SCHEMA exam_access_draft FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA exam_access_draft FROM PUBLIC;
COMMIT;
