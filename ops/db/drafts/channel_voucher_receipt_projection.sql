-- DRAFT: isolated test only; not in production migration discovery.
-- Central ledger intake/projection, not a second payment ledger.
-- Provider verification, actual billing_orders linkage, and live access integration remain separate.
BEGIN;
CREATE SCHEMA IF NOT EXISTS voucher_draft;
CREATE TABLE IF NOT EXISTS voucher_draft.units(
 channel text NOT NULL CHECK(channel IN ('xiaohongshu','douyin','taobao')),
 merchant_id text NOT NULL CHECK(length(merchant_id) BETWEEN 1 AND 128),
 order_line_id text NOT NULL CHECK(length(order_line_id) BETWEEN 1 AND 128),
 unit_index integer NOT NULL CHECK(unit_index BETWEEN 0 AND 9999),
 sku text NOT NULL CHECK(length(sku) BETWEEN 1 AND 128),
 content_id text NOT NULL CHECK(length(content_id) BETWEEN 1 AND 128),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000),
 expires_at timestamptz NOT NULL,
 code_digest text NOT NULL UNIQUE CHECK(code_digest ~ '^[0-9a-f]{64}$'),
 verified_receipt_digest text NOT NULL CHECK(verified_receipt_digest ~ '^[0-9a-f]{64}$'),
 paid_at timestamptz NOT NULL,
 owner_id text CHECK(owner_id ~ '^par_[a-zA-Z0-9_]+$'),
 claimed_at timestamptz,
 revoked_at timestamptz,
 PRIMARY KEY(channel,merchant_id,order_line_id,unit_index),
 CHECK(expires_at>paid_at),
 CHECK((owner_id IS NULL)=(claimed_at IS NULL))
);
-- A single immutable voucher unit is the source of the draft entitlement;
-- no synthetic payer or fake WeChat transaction, no standalone financial totals.
CREATE OR REPLACE VIEW voucher_draft.active_grants AS
 SELECT channel,merchant_id,order_line_id,unit_index,sku,content_id,capacity,expires_at,owner_id,claimed_at
 FROM voucher_draft.units WHERE claimed_at IS NOT NULL AND revoked_at IS NULL AND expires_at>now();
-- Tombstone prevents refund-first callbacks from being resurrected by delayed paid events.
CREATE TABLE IF NOT EXISTS voucher_draft.refunds(
 channel text NOT NULL CHECK(channel IN ('xiaohongshu','douyin','taobao')),
 merchant_id text NOT NULL CHECK(length(merchant_id) BETWEEN 1 AND 128),
 order_line_id text NOT NULL CHECK(length(order_line_id) BETWEEN 1 AND 128),
 unit_index integer NOT NULL CHECK(unit_index BETWEEN 0 AND 9999),
 receipt_digest text NOT NULL CHECK(receipt_digest ~ '^[0-9a-f]{64}$'),
 verified_at timestamptz NOT NULL,
 PRIMARY KEY(channel,merchant_id,order_line_id,unit_index)
);
CREATE OR REPLACE FUNCTION voucher_draft.unit_lock(c text,m text,l text,i integer)
 RETURNS void LANGUAGE sql AS $$
 SELECT pg_advisory_xact_lock(hashtextextended(jsonb_build_array(c,m,l,i)::text, 4317));
$$;
-- Caller is a trusted verified channel adapter, not a browser.
CREATE OR REPLACE FUNCTION voucher_draft.issue(c text,m text,l text,i integer,s text,p text,n integer,e timestamptz,h text,r text,t timestamptz)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE prior voucher_draft.units%ROWTYPE;
 BEGIN
 PERFORM voucher_draft.unit_lock(c,m,l,i);
 IF EXISTS(SELECT 1 FROM voucher_draft.refunds WHERE (channel,merchant_id,order_line_id,unit_index)=(c,m,l,i)) THEN RETURN 'refunded'; END IF;
 SELECT * INTO prior FROM voucher_draft.units WHERE (channel,merchant_id,order_line_id,unit_index)=(c,m,l,i);
 IF FOUND THEN
  IF (prior.sku,prior.content_id,prior.capacity,prior.expires_at,prior.code_digest) IS DISTINCT FROM (s,p,n,e,h) THEN RAISE EXCEPTION 'immutable unit conflict'; END IF;
  RETURN 'already_issued';
 END IF;
 INSERT INTO voucher_draft.units(channel,merchant_id,order_line_id,unit_index,sku,content_id,capacity,expires_at,code_digest,verified_receipt_digest,paid_at)
 VALUES(c,m,l,i,s,p,n,e,h,r,t);
 RETURN 'issued';
 END;
$$;
-- The single row update atomically creates the draft entitlement projection.
CREATE OR REPLACE FUNCTION voucher_draft.claim(h text,a text)
 RETURNS text LANGUAGE plpgsql AS $$
 DECLARE u voucher_draft.units%ROWTYPE;
 BEGIN
 IF a IS NULL OR a !~ '^par_[a-zA-Z0-9_]+$' THEN RAISE EXCEPTION 'invalid actor'; END IF;
 SELECT * INTO u FROM voucher_draft.units WHERE code_digest=h;
 IF NOT FOUND THEN RETURN 'unavailable'; END IF;
 PERFORM voucher_draft.unit_lock(u.channel,u.merchant_id,u.order_line_id,u.unit_index);
 SELECT * INTO u FROM voucher_draft.units WHERE code_digest=h FOR UPDATE;
 IF NOT FOUND OR u.revoked_at IS NOT NULL OR u.expires_at<=clock_timestamp() THEN RETURN 'unavailable'; END IF;
 IF u.owner_id IS NOT NULL THEN
  IF u.owner_id=a THEN RETURN 'already_claimed'; ELSE RETURN 'unavailable'; END IF;
 END IF;
 UPDATE voucher_draft.units SET owner_id=a,claimed_at=clock_timestamp() WHERE code_digest=h;
 RETURN 'claimed';
 END;
$$;
CREATE OR REPLACE FUNCTION voucher_draft.refund(c text,m text,l text,i integer,r text,t timestamptz)
 RETURNS text LANGUAGE plpgsql AS $$
 BEGIN
 PERFORM voucher_draft.unit_lock(c,m,l,i);
 INSERT INTO voucher_draft.refunds VALUES(c,m,l,i,r,t) ON CONFLICT DO NOTHING;
 UPDATE voucher_draft.units SET revoked_at=t WHERE (channel,merchant_id,order_line_id,unit_index)=(c,m,l,i) AND revoked_at IS NULL;
 RETURN 'revoked';
 END;
$$;
REVOKE ALL ON SCHEMA voucher_draft FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA voucher_draft FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA voucher_draft FROM PUBLIC;
COMMIT;
