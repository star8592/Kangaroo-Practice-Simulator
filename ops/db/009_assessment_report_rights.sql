-- One-time per-instrument premium self-exploration report entitlement.
-- Reuses EXISTING billing_orders/payment receipts/billing_item_entitlements.
-- No report SKU is activated or charged by running this schema migration.
-- Existing exam/resource subscriptions and orders remain unchanged.
BEGIN;
ALTER TABLE billing_products DROP CONSTRAINT IF EXISTS billing_products_shape_check;
ALTER TABLE billing_products ADD CONSTRAINT billing_products_shape_check CHECK (
  (product_kind='subscription' AND tier IN ('plus','pro') AND period IN ('month','year')
    AND content_kind IS NULL AND content_id IS NULL)
  OR
  (product_kind='item' AND tier IS NULL AND period IS NULL
    AND content_kind IN ('exam','resource','report')
    AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
    AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
);
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_item_shape_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_item_shape_check CHECK (
  (product_kind='subscription' AND content_kind IS NULL AND content_id IS NULL)
  OR
  (product_kind='item' AND content_kind IN ('exam','resource','report')
    AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200)
);
ALTER TABLE billing_item_entitlements DROP CONSTRAINT IF EXISTS billing_item_entitlements_content_kind_check;
ALTER TABLE billing_item_entitlements ADD CONSTRAINT billing_item_entitlements_content_kind_check CHECK (
  content_kind IN ('exam','resource','report')
);
COMMIT;
