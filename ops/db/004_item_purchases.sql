-- Add item-level purchases to the ONE billing ledger. Safe for existing PLUS/PRO orders.
-- New sellable item SKUs are impossible by default: enabled/rights/delivery all false.
BEGIN;
ALTER TABLE billing_products
  ADD COLUMN IF NOT EXISTS product_kind text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS content_kind text,
  ADD COLUMN IF NOT EXISTS content_id text,
  ADD COLUMN IF NOT EXISTS rights_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_restricted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title_zh text;
ALTER TABLE billing_products
  ALTER COLUMN tier DROP NOT NULL,
  ALTER COLUMN period DROP NOT NULL;
ALTER TABLE billing_products DROP CONSTRAINT IF EXISTS billing_products_tier_check;
ALTER TABLE billing_products DROP CONSTRAINT IF EXISTS billing_products_period_check;
ALTER TABLE billing_products DROP CONSTRAINT IF EXISTS billing_products_shape_check;
ALTER TABLE billing_products ADD CONSTRAINT billing_products_shape_check CHECK (
  (product_kind='subscription' AND tier IN ('plus','pro') AND period IN ('month','year')
    AND content_kind IS NULL AND content_id IS NULL)
  OR
  (product_kind='item' AND tier IS NULL AND period IS NULL
    AND content_kind IN ('exam','resource') AND
    content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
    AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
);
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS product_kind text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS content_kind text,
  ADD COLUMN IF NOT EXISTS content_id text,
  ADD COLUMN IF NOT EXISTS title_snapshot text;
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_item_shape_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_item_shape_check CHECK (
  (product_kind='subscription' AND content_kind IS NULL AND content_id IS NULL)
  OR
  (product_kind='item' AND content_kind IN ('exam','resource')
    AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200)
);
-- Item grants are a typed projection of the same paid orders, not another ledger.
CREATE TABLE IF NOT EXISTS billing_item_entitlements (
  id text PRIMARY KEY,
  payer_parent_id text NOT NULL,
  source_order_id text NOT NULL UNIQUE REFERENCES billing_orders(id),
  content_kind text NOT NULL CHECK (content_kind IN ('exam','resource')),
  content_id text NOT NULL CHECK (length(content_id) BETWEEN 1 AND 200),
  granted_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_item_grants_owner_idx
  ON billing_item_entitlements(payer_parent_id,content_kind,content_id)
  WHERE revoked_at IS NULL;
-- Allow only one live sellable SKU per content item, avoid ambiguity at checkout.
CREATE UNIQUE INDEX IF NOT EXISTS billing_products_active_item_idx
  ON billing_products(content_kind,content_id)
  WHERE product_kind='item' AND enabled=true;
COMMIT;
