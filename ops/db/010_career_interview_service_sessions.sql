-- Paid AI interview sessions are a service, not a permanent exam/report item.
-- Additive to the ONE verified WeChat billing ledger. No SKU is activated here.
-- Run only after 001-009; old paid item and subscription rows remain unchanged.
BEGIN;
ALTER TABLE billing_products ADD COLUMN IF NOT EXISTS service_sessions integer;
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS service_sessions_snapshot integer;
ALTER TABLE billing_products DROP CONSTRAINT IF EXISTS billing_products_shape_check;
ALTER TABLE billing_products ADD CONSTRAINT billing_products_shape_check CHECK (
  (product_kind='subscription' AND tier IN ('plus','pro') AND period IN ('month','year')
    AND content_kind IS NULL AND content_id IS NULL AND service_sessions IS NULL)
  OR (product_kind='item' AND tier IS NULL AND period IS NULL AND service_sessions IS NULL
    AND content_kind IN ('exam','resource','report')
    AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
    AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
  OR (product_kind='service' AND tier IS NULL AND period IS NULL
    AND content_kind='career_interview'
    AND content_id IN ('campus-software','social-procurement')
    AND service_sessions BETWEEN 1 AND 20 AND amount_minor>0 AND currency='CNY'
    AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
);
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_item_shape_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_item_shape_check CHECK (
  (product_kind='subscription' AND content_kind IS NULL AND content_id IS NULL
    AND service_sessions_snapshot IS NULL)
  OR (product_kind='item' AND content_kind IN ('exam','resource','report')
    AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
    AND service_sessions_snapshot IS NULL)
  OR (product_kind='service' AND content_kind='career_interview'
    AND content_id IN ('campus-software','social-procurement')
    AND service_sessions_snapshot BETWEEN 1 AND 20)
);
-- Retrying checkout may not create a second independently payable WeChat QR.
CREATE UNIQUE INDEX IF NOT EXISTS billing_career_pending_sku_once
  ON billing_orders(payer_parent_id,product_id)
  WHERE product_kind='service' AND state='pending';
CREATE TABLE IF NOT EXISTS billing_career_session_grants (
  source_order_id text PRIMARY KEY REFERENCES billing_orders(id),
  payer_parent_id text NOT NULL,
  profile_id text NOT NULL CHECK (profile_id IN ('campus-software','social-procurement')),
  purchased_sessions integer NOT NULL CHECK (purchased_sessions BETWEEN 1 AND 20),
  remaining_sessions integer NOT NULL CHECK (remaining_sessions>=0 AND remaining_sessions<=purchased_sessions),
  granted_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS billing_career_active_grants
  ON billing_career_session_grants(payer_parent_id,profile_id,granted_at)
  WHERE revoked_at IS NULL AND remaining_sessions>0;
CREATE TABLE IF NOT EXISTS billing_career_sessions (
  id text PRIMARY KEY CHECK (id ~ '^cais_[0-9a-f]{32}$'),
  payer_parent_id text NOT NULL,
  profile_id text NOT NULL CHECK (profile_id IN ('campus-software','social-procurement')),
  source_order_id text NOT NULL REFERENCES billing_career_session_grants(source_order_id),
  client_request_id text NOT NULL CHECK (client_request_id ~ '^[a-f0-9-]{36}$'),
  started_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payer_parent_id,profile_id,client_request_id)
);
CREATE INDEX IF NOT EXISTS billing_career_sessions_owner_idx
  ON billing_career_sessions(payer_parent_id,profile_id,started_at DESC);
CREATE TABLE IF NOT EXISTS billing_career_round_calls (
  session_id text NOT NULL REFERENCES billing_career_sessions(id),
  question_id text NOT NULL CHECK (length(question_id) BETWEEN 3 AND 80),
  status text NOT NULL CHECK (status IN ('pending','done','failed')),
  claim_token text NOT NULL CHECK (claim_token ~ '^[0-9a-f]{32}$'),
  attempt_count integer NOT NULL CHECK (attempt_count BETWEEN 1 AND 2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id,question_id)
);
COMMIT;
