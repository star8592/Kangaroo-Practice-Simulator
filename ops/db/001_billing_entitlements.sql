-- Billing data model v1. No preexisting table is modified.
-- Apply only to an isolated dedicated Postgres database after backup.
BEGIN;
CREATE TABLE IF NOT EXISTS billing_products (
  id text PRIMARY KEY,
  tier text NOT NULL CHECK (tier IN ('plus', 'pro')),
  period text NOT NULL CHECK (period IN ('month', 'year')),
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS billing_orders (
  id text PRIMARY KEY,
  payer_parent_id text NOT NULL CHECK (length(payer_parent_id) > 0),
  product_id text NOT NULL REFERENCES billing_products(id),
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL,
  provider text NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','paid','closed','refunded')),
  provider_transaction_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
CREATE INDEX IF NOT EXISTS billing_orders_parent_state_idx
  ON billing_orders (payer_parent_id, state, created_at DESC);
CREATE TABLE IF NOT EXISTS billing_payment_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  order_id text NOT NULL REFERENCES billing_orders(id),
  event_kind text NOT NULL CHECK (event_kind IN ('paid','refunded')),
  transaction_id text NOT NULL,
  verified_at timestamptz NOT NULL,
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);
CREATE INDEX IF NOT EXISTS billing_payment_events_order_idx ON billing_payment_events (order_id);
CREATE TABLE IF NOT EXISTS billing_entitlements (
  id text PRIMARY KEY,
  payer_parent_id text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('plus','pro')),
  source_order_id text NOT NULL UNIQUE REFERENCES billing_orders(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS billing_entitlements_parent_active_idx
  ON billing_entitlements (payer_parent_id, ends_at DESC);
CREATE TABLE IF NOT EXISTS billing_family_links (
  parent_id text NOT NULL,
  student_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  guardian_verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);
CREATE INDEX IF NOT EXISTS billing_family_links_student_idx
  ON billing_family_links (student_id) WHERE status = 'active';
CREATE TABLE IF NOT EXISTS billing_usage_buckets (
  payer_parent_id text NOT NULL,
  capability text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  capacity integer NOT NULL CHECK (capacity >= 0),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0 AND used <= capacity),
  PRIMARY KEY (payer_parent_id, capability, period_start),
  CHECK (period_end > period_start)
);
CREATE TABLE IF NOT EXISTS billing_usage_events (
  idempotency_key text PRIMARY KEY,
  payer_parent_id text NOT NULL,
  capability text NOT NULL,
  period_start timestamptz NOT NULL,
  units integer NOT NULL CHECK (units > 0),
  action_id text NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (payer_parent_id,capability,period_start)
    REFERENCES billing_usage_buckets(payer_parent_id,capability,period_start)
);
CREATE TABLE IF NOT EXISTS billing_access_audit (
  id bigserial PRIMARY KEY,
  actor_id text,
  owner_id text,
  capability text NOT NULL,
  resource_key text,
  decision text NOT NULL,
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
