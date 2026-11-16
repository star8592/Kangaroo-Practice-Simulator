-- R181: one platform ledger also owns institution seat purchases.
-- This migration publishes ZERO SKUs and authorizes ZERO organizations.
-- Apply after 001-011 in the isolated billing database, then only after
-- a separate production backup + approved rollout.
BEGIN;
ALTER TABLE billing_products
 ADD COLUMN IF NOT EXISTS organization_seats integer,
 ADD COLUMN IF NOT EXISTS organization_days integer;
ALTER TABLE billing_orders
 ADD COLUMN IF NOT EXISTS organization_id uuid,
 ADD COLUMN IF NOT EXISTS organization_seats_snapshot integer,
 ADD COLUMN IF NOT EXISTS organization_days_snapshot integer;
ALTER TABLE billing_products DROP CONSTRAINT IF EXISTS billing_products_shape_check;
ALTER TABLE billing_products ADD CONSTRAINT billing_products_shape_check CHECK (
 (product_kind='subscription' AND tier IN ('plus','pro')
   AND period IN ('month','year') AND content_kind IS NULL AND content_id IS NULL
   AND service_sessions IS NULL AND service_billing_mode IS NULL
   AND organization_seats IS NULL AND organization_days IS NULL)
 OR
 (product_kind='item' AND tier IS NULL AND period IS NULL
   AND service_sessions IS NULL AND service_billing_mode IS NULL
   AND organization_seats IS NULL AND organization_days IS NULL
   AND content_kind IN ('exam','resource','report')
   AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
   AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
 OR
 (product_kind='service' AND tier IS NULL AND period IS NULL
   AND content_kind='career_interview'
   AND content_id IN ('campus-software','social-procurement')
   AND service_billing_mode IN ('per_use','monthly')
   AND ((service_billing_mode='per_use' AND service_sessions BETWEEN 1 AND 20)
     OR (service_billing_mode='monthly' AND service_sessions BETWEEN 1 AND 60))
   AND organization_seats IS NULL AND organization_days IS NULL
   AND amount_minor>0 AND currency='CNY'
   AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
 OR
 (product_kind='organization' AND tier IS NULL AND period IS NULL
   AND content_kind='vocab_seats' AND content_id='vocabulary'
   AND service_sessions IS NULL AND service_billing_mode IS NULL
   AND organization_seats BETWEEN 1 AND 10000
   AND organization_days BETWEEN 1 AND 366
   AND amount_minor>0 AND currency='CNY'
   AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
);
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_item_shape_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_item_shape_check CHECK (
 (product_kind='subscription' AND content_kind IS NULL AND content_id IS NULL
  AND service_sessions_snapshot IS NULL AND service_billing_mode_snapshot IS NULL
  AND organization_id IS NULL AND organization_seats_snapshot IS NULL
  AND organization_days_snapshot IS NULL)
 OR
 (product_kind='item' AND content_kind IN ('exam','resource','report')
  AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
  AND service_sessions_snapshot IS NULL AND service_billing_mode_snapshot IS NULL
  AND organization_id IS NULL AND organization_seats_snapshot IS NULL
  AND organization_days_snapshot IS NULL)
 OR
 (product_kind='service' AND content_kind='career_interview'
  AND content_id IN ('campus-software','social-procurement')
  AND service_billing_mode_snapshot IN ('per_use','monthly')
  AND ((service_billing_mode_snapshot='per_use' AND service_sessions_snapshot BETWEEN 1 AND 20)
    OR (service_billing_mode_snapshot='monthly' AND service_sessions_snapshot BETWEEN 1 AND 60))
  AND organization_id IS NULL AND organization_seats_snapshot IS NULL
  AND organization_days_snapshot IS NULL)
 OR
 (product_kind='organization' AND content_kind='vocab_seats' AND content_id='vocabulary'
  AND service_sessions_snapshot IS NULL AND service_billing_mode_snapshot IS NULL
  AND organization_id IS NOT NULL AND organization_seats_snapshot BETWEEN 1 AND 10000
  AND organization_days_snapshot BETWEEN 1 AND 366)
);
-- Only trusted VOCAB backend may attest an existing organization's OWNER
-- membership. The attestation must be rechecked after five minutes.
CREATE TABLE IF NOT EXISTS billing_organization_owner_bindings(
 product text NOT NULL CHECK(product='vocabulary'),
 organization_id uuid NOT NULL,
 buyer_parent_id text NOT NULL CHECK(buyer_parent_id ~ '^par_[a-f0-9]{18}$'),
 verified_subject text NOT NULL CHECK(verified_subject ~ '^soc_[a-f0-9]{40}$'),
 verified_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(product,organization_id),
 CHECK(expires_at>verified_at AND expires_at<=verified_at+interval '5 minutes')
);
CREATE INDEX IF NOT EXISTS billing_org_owner_buyer_idx
 ON billing_organization_owner_bindings(buyer_parent_id,expires_at DESC);
-- Every grant is anchored to a provider-settled immutable central order.
CREATE TABLE IF NOT EXISTS billing_organization_entitlements(
 source_order_id text PRIMARY KEY REFERENCES billing_orders(id),
 product text NOT NULL CHECK(product='vocabulary'),
 organization_id uuid NOT NULL,
 buyer_parent_id text NOT NULL CHECK(buyer_parent_id ~ '^par_[a-f0-9]{18}$'),
 seat_limit integer NOT NULL CHECK(seat_limit BETWEEN 1 AND 10000),
 valid_from timestamptz NOT NULL,
 valid_until timestamptz NOT NULL,
 revoked_at timestamptz,
 CHECK(valid_until>valid_from)
);
CREATE INDEX IF NOT EXISTS billing_org_active_idx
 ON billing_organization_entitlements(product,organization_id,valid_until DESC)
 WHERE revoked_at IS NULL;
-- One pending organization purchase across ALL seat SKUs, not one per SKU.
-- Otherwise competing 30-seat and 100-seat QR payments could both settle.
CREATE UNIQUE INDEX IF NOT EXISTS billing_one_pending_org
 ON billing_orders(organization_id)
 WHERE product_kind='organization' AND state='pending';
COMMIT;
