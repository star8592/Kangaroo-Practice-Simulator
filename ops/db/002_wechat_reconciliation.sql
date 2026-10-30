-- Additive migration: track independent official-provider recovery attempts.
-- Does not modify order financial amounts or previous paid grants.
BEGIN;
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS reconcile_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS billing_orders_native_reconcile_idx
  ON billing_orders (reconcile_checked_at, created_at)
  WHERE provider='wechat_native' AND state='pending';
COMMIT;
