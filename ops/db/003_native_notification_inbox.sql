-- No second ledger or scheduler. Persist authenticated Native callback proof
-- on the same authoritative order row before acknowledging to WeChat.
BEGIN;
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS notification_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_event_id text,
  ADD COLUMN IF NOT EXISTS notification_transaction_id text,
  ADD COLUMN IF NOT EXISTS notification_payload_sha256 char(64);
COMMIT;
