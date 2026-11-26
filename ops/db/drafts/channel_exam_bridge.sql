-- Isolated integration candidate only. Apply after both voucher and exam drafts.
-- Preserve all existing ledger shapes; the new kind must never fall through to
-- the existing WeChat settlement/checkout branches. No live SKUs inserted here.
BEGIN;
DO $$
DECLARE expr text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='billing_products_exam_bridge_marker' AND conrelid='public.billing_products'::regclass) THEN
  SELECT pg_get_expr(conbin,conrelid) INTO STRICT expr FROM pg_constraint WHERE conname='billing_products_shape_check' AND conrelid='public.billing_products'::regclass;
  ALTER TABLE public.billing_products DROP CONSTRAINT billing_products_shape_check;
  EXECUTE 'ALTER TABLE public.billing_products ADD CONSTRAINT billing_products_shape_check CHECK (('||expr||') OR (product_kind=''exam_access'' AND tier IS NULL AND period IS NULL AND content_kind=''exam_access'' AND content_id IS NOT NULL AND title_zh IS NOT NULL AND currency=''CNY'' AND amount_minor>0 AND service_sessions IS NULL AND service_billing_mode IS NULL AND organization_seats IS NULL AND organization_days IS NULL))';
  ALTER TABLE public.billing_products ADD CONSTRAINT billing_products_exam_bridge_marker CHECK (product_kind<>'exam_access' OR content_kind='exam_access');
  SELECT pg_get_expr(conbin,conrelid) INTO STRICT expr FROM pg_constraint WHERE conname='billing_orders_item_shape_check' AND conrelid='public.billing_orders'::regclass;
  ALTER TABLE public.billing_orders DROP CONSTRAINT billing_orders_item_shape_check;
  EXECUTE 'ALTER TABLE public.billing_orders ADD CONSTRAINT billing_orders_item_shape_check CHECK (('||expr||') OR (product_kind=''exam_access'' AND content_kind=''exam_access'' AND content_id IS NOT NULL AND service_sessions_snapshot IS NULL AND service_billing_mode_snapshot IS NULL AND organization_id IS NULL AND organization_seats_snapshot IS NULL AND organization_days_snapshot IS NULL))';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS exam_access_draft.offer_terms(
 product_id text PRIMARY KEY REFERENCES public.billing_products(id),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000),
 expires_at timestamptz NOT NULL,
 paper_access text NOT NULL CHECK(paper_access IN ('five_verified_papers','all_verified_papers_and_updates'))
);
CREATE TABLE IF NOT EXISTS exam_access_draft.order_terms(
 source_order_id text PRIMARY KEY REFERENCES public.billing_orders(id),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000),
 expires_at timestamptz NOT NULL,
 paper_access text NOT NULL CHECK(paper_access IN ('five_verified_papers','all_verified_papers_and_updates'))
);
CREATE TABLE IF NOT EXISTS voucher_draft.channel_mapping(
 channel text NOT NULL CHECK(channel IN ('xiaohongshu','douyin','taobao')),
 merchant_id text NOT NULL,
 external_sku text NOT NULL,
 product_id text NOT NULL REFERENCES public.billing_products(id),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000),
 expires_at timestamptz NOT NULL,
 approved boolean NOT NULL DEFAULT false,
 PRIMARY KEY(channel,merchant_id,external_sku)
);
CREATE TABLE IF NOT EXISTS voucher_draft.order_receipts(
 channel text NOT NULL,
 merchant_id text NOT NULL,
 order_line_id text NOT NULL,
 unit_index integer NOT NULL,
 provider_transaction text NOT NULL CHECK(length(provider_transaction) BETWEEN 1 AND 256),
 external_sku text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency text NOT NULL CHECK(currency='CNY'),
 title_snapshot text NOT NULL,
 paper_access text NOT NULL CHECK(paper_access IN ('five_verified_papers','all_verified_papers_and_updates')),
 central_order_id text UNIQUE REFERENCES public.billing_orders(id),
 PRIMARY KEY(channel,merchant_id,order_line_id,unit_index),
 FOREIGN KEY(channel,merchant_id,order_line_id,unit_index) REFERENCES voucher_draft.units(channel,merchant_id,order_line_id,unit_index)
);
-- This function is an internal post-verification adapter boundary; callers must
-- independently verify platform payment, allocated unit amount and identity.
-- Full refunds per unit only. No promotion/discount allocation until validated.
CREATE OR REPLACE FUNCTION voucher_draft.issue_exam(c text,m text,l text,i integer,x text,tx text,amount bigint,cur text,h text,r text,t timestamptz)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE map voucher_draft.channel_mapping%ROWTYPE;
 DECLARE p public.billing_products%ROWTYPE;
 DECLARE old voucher_draft.order_receipts%ROWTYPE;
 DECLARE outcome text;
 DECLARE terms exam_access_draft.offer_terms%ROWTYPE;
 BEGIN
 PERFORM voucher_draft.unit_lock(c,m,l,i);
 IF EXISTS(SELECT 1 FROM voucher_draft.refunds WHERE (channel,merchant_id,order_line_id,unit_index)=(c,m,l,i)) THEN RETURN 'refunded'; END IF;
 SELECT * INTO old FROM voucher_draft.order_receipts WHERE (channel,merchant_id,order_line_id,unit_index)=(c,m,l,i);
 IF FOUND THEN
  IF (old.external_sku,old.provider_transaction,old.amount_minor,old.currency) IS DISTINCT FROM (x,tx,amount,cur) OR NOT EXISTS(SELECT 1 FROM voucher_draft.units WHERE (channel,merchant_id,order_line_id,unit_index)=(c,m,l,i) AND code_digest=h) THEN RAISE EXCEPTION 'receipt conflict'; END IF;
  RETURN 'already_issued';
 END IF;
 SELECT * INTO map FROM voucher_draft.channel_mapping WHERE (channel,merchant_id,external_sku)=(c,m,x) AND approved FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'channel SKU unavailable'; END IF;
 SELECT * INTO p FROM public.billing_products WHERE id=map.product_id AND enabled AND product_kind='exam_access' AND rights_approved AND delivery_verified AND access_restricted FOR SHARE;
 IF NOT FOUND OR amount IS DISTINCT FROM p.amount_minor OR cur IS DISTINCT FROM p.currency OR map.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'product or amount unavailable'; END IF;
 SELECT * INTO terms FROM exam_access_draft.offer_terms WHERE product_id=p.id FOR SHARE;
 IF NOT FOUND OR (terms.capacity,terms.expires_at) IS DISTINCT FROM (map.capacity,map.expires_at) THEN RAISE EXCEPTION 'channel terms differ from central offer'; END IF;
 IF terms.paper_access='five_verified_papers' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(p.content_id,5438));
  IF (SELECT count(*) FROM exam_access_draft.basic_papers b JOIN exam_access_draft.paper_registry r USING(exam_key,paper_id) WHERE b.exam_key=p.content_id AND r.verified AND r.available)<>5 THEN RAISE EXCEPTION 'basic bundle not ready'; END IF;
 END IF;
 outcome:=voucher_draft.issue(c,m,l,i,p.id,p.content_id,terms.capacity,terms.expires_at,h,r,t);
 IF outcome<>'issued' THEN RAISE EXCEPTION 'missing integrated receipt'; END IF;
 INSERT INTO voucher_draft.order_receipts(channel,merchant_id,order_line_id,unit_index,provider_transaction,external_sku,amount_minor,currency,title_snapshot,paper_access)
 VALUES(c,m,l,i,tx,x,amount,cur,p.title_zh,terms.paper_access);
 RETURN 'issued';
 END;
$$;
-- Only a trusted authenticated account with approved platform redemption can call.
-- Activation, canonical billing order, receipt event and scoring entitlement are atomic.
CREATE OR REPLACE FUNCTION voucher_draft.claim_exam(h text,a text)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE u voucher_draft.units%ROWTYPE;
 DECLARE rec voucher_draft.order_receipts%ROWTYPE;
 DECLARE oid text;
 DECLARE outcome text;
 BEGIN
 SELECT * INTO u FROM voucher_draft.units WHERE code_digest=h;
 IF NOT FOUND THEN RETURN 'unavailable'; END IF;
 PERFORM voucher_draft.unit_lock(u.channel,u.merchant_id,u.order_line_id,u.unit_index);
 SELECT * INTO rec FROM voucher_draft.order_receipts WHERE (channel,merchant_id,order_line_id,unit_index)=(u.channel,u.merchant_id,u.order_line_id,u.unit_index) FOR UPDATE;
 IF NOT FOUND THEN RETURN 'unavailable'; END IF;
 outcome:=voucher_draft.claim(h,a);
 IF outcome='unavailable' THEN RETURN outcome; END IF;
 IF outcome='already_claimed' THEN
  IF rec.central_order_id IS NULL OR NOT EXISTS(SELECT 1 FROM exam_access_draft.grants WHERE source_order_id=rec.central_order_id AND owner_id=a) THEN RAISE EXCEPTION 'missing linked grant'; END IF;
  RETURN outcome;
 END IF;
 oid:='ext_exam_'||gen_random_uuid()::text;
 -- Actual transaction retained on unit receipt and event; a single provider
 -- transaction may pay multiple units, so do not fabricate unique txn IDs.
 INSERT INTO public.billing_orders(id,payer_parent_id,product_id,price_minor,currency,provider,state,paid_at,product_kind,content_kind,content_id,title_snapshot)
 VALUES(oid,a,u.sku,rec.amount_minor,rec.currency,u.channel,'paid',u.paid_at,'exam_access','exam_access',u.content_id,rec.title_snapshot);
 INSERT INTO public.billing_payment_events(provider,event_id,order_id,event_kind,transaction_id,verified_at,payload_sha256)
 VALUES(u.channel,oid||':paid',oid,'paid',rec.provider_transaction,u.paid_at,u.verified_receipt_digest);
 INSERT INTO exam_access_draft.order_terms VALUES(oid,u.capacity,u.expires_at,rec.paper_access);
 INSERT INTO exam_access_draft.grants(source_order_id,owner_id,exam_key,capacity,expires_at)
 VALUES(oid,a,u.content_id,u.capacity,u.expires_at);
 UPDATE voucher_draft.order_receipts SET central_order_id=oid WHERE (channel,merchant_id,order_line_id,unit_index)=(u.channel,u.merchant_id,u.order_line_id,u.unit_index);
 RETURN 'claimed';
 END;
$$;
CREATE OR REPLACE FUNCTION voucher_draft.refund_exam(c text,m text,l text,i integer,r text,t timestamptz)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE rec voucher_draft.order_receipts%ROWTYPE;
 BEGIN
 PERFORM voucher_draft.unit_lock(c,m,l,i);
 PERFORM voucher_draft.refund(c,m,l,i,r,t);
 SELECT * INTO rec FROM voucher_draft.order_receipts WHERE (channel,merchant_id,order_line_id,unit_index)=(c,m,l,i) FOR UPDATE;
 IF FOUND AND rec.central_order_id IS NOT NULL THEN
  UPDATE public.billing_orders SET state='refunded',refunded_at=t WHERE id=rec.central_order_id AND state='paid';
  IF FOUND THEN
   UPDATE exam_access_draft.grants SET revoked_at=t WHERE source_order_id=rec.central_order_id AND revoked_at IS NULL;
   INSERT INTO public.billing_payment_events(provider,event_id,order_id,event_kind,transaction_id,verified_at,payload_sha256)
   VALUES(c,rec.central_order_id||':refund',rec.central_order_id,'refunded',rec.provider_transaction,t,r);
  END IF;
 END IF;
 RETURN 'revoked';
 END;
$$;
REVOKE ALL ON ALL TABLES IN SCHEMA voucher_draft FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA voucher_draft FROM PUBLIC;
COMMIT;
