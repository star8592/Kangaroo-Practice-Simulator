-- Never release a pending item-order uniqueness slot on a local timer alone.
-- Persist signed, independently queried official WeChat CLOSED evidence.
BEGIN;
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_provider_payload_sha256 char(64);
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_close_proof_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_close_proof_check
  CHECK (
    (state='closed' AND closed_at IS NOT NULL AND
      close_provider_payload_sha256 IS NOT NULL AND
      close_provider_payload_sha256 ~ '^[a-f0-9]{64}$')
    OR
    (state<>'closed' AND closed_at IS NULL AND
      close_provider_payload_sha256 IS NULL)
  );
COMMIT;
