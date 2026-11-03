-- Career AI has exactly two commercial modes: prepaid sessions and a 30-day monthly plan.
-- No autopay enrollment and no SKU activation are performed by this additive migration.
-- Run after 010; both the user-visible plan and the exact purchased quota are snapshotted.
BEGIN;
ALTER TABLE billing_products ADD COLUMN IF NOT EXISTS service_billing_mode text;
UPDATE billing_products SET service_billing_mode='per_use'
 WHERE product_kind='service' AND content_kind='career_interview' AND service_billing_mode IS NULL;
ALTER TABLE billing_orders ADD COLUMN IF NOT EXISTS service_billing_mode_snapshot text;
UPDATE billing_orders SET service_billing_mode_snapshot='per_use'
 WHERE product_kind='service' AND content_kind='career_interview' AND service_billing_mode_snapshot IS NULL;
ALTER TABLE billing_products DROP CONSTRAINT IF EXISTS billing_products_shape_check;
ALTER TABLE billing_products ADD CONSTRAINT billing_products_shape_check CHECK (
  (product_kind='subscription' AND tier IN ('plus','pro') AND period IN ('month','year')
    AND content_kind IS NULL AND content_id IS NULL AND service_sessions IS NULL
    AND service_billing_mode IS NULL)
  OR (product_kind='item' AND tier IS NULL AND period IS NULL AND service_sessions IS NULL
    AND service_billing_mode IS NULL
    AND content_kind IN ('exam','resource','report')
    AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
    AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
  OR (product_kind='service' AND tier IS NULL AND period IS NULL
    AND content_kind='career_interview'
    AND content_id IN ('campus-software','social-procurement')
    AND service_billing_mode IN ('per_use','monthly')
    AND ((service_billing_mode='per_use' AND service_sessions BETWEEN 1 AND 20)
      OR (service_billing_mode='monthly' AND service_sessions BETWEEN 1 AND 60))
    AND amount_minor>0 AND currency='CNY'
    AND title_zh IS NOT NULL AND length(trim(title_zh)) BETWEEN 2 AND 120)
);
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_item_shape_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_item_shape_check CHECK (
  (product_kind='subscription' AND content_kind IS NULL AND content_id IS NULL
    AND service_sessions_snapshot IS NULL AND service_billing_mode_snapshot IS NULL)
  OR (product_kind='item' AND content_kind IN ('exam','resource','report')
    AND content_id IS NOT NULL AND length(content_id) BETWEEN 1 AND 200
    AND service_sessions_snapshot IS NULL AND service_billing_mode_snapshot IS NULL)
  OR (product_kind='service' AND content_kind='career_interview'
    AND content_id IN ('campus-software','social-procurement')
    AND service_billing_mode_snapshot IN ('per_use','monthly')
    AND ((service_billing_mode_snapshot='per_use' AND service_sessions_snapshot BETWEEN 1 AND 20)
      OR (service_billing_mode_snapshot='monthly' AND service_sessions_snapshot BETWEEN 1 AND 60)))
);
ALTER TABLE billing_career_session_grants
 ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'per_use',
 ADD COLUMN IF NOT EXISTS valid_from timestamptz,
 ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE billing_career_session_grants DROP CONSTRAINT IF EXISTS billing_career_session_grants_purchased_sessions_check;
ALTER TABLE billing_career_session_grants ADD CONSTRAINT billing_career_session_grants_purchased_sessions_check
 CHECK ((billing_mode='per_use' AND purchased_sessions BETWEEN 1 AND 20)
     OR (billing_mode='monthly' AND purchased_sessions BETWEEN 1 AND 60));
ALTER TABLE billing_career_session_grants DROP CONSTRAINT IF EXISTS billing_career_grant_period_check;
ALTER TABLE billing_career_session_grants ADD CONSTRAINT billing_career_grant_period_check
 CHECK ((billing_mode='per_use' AND valid_from IS NULL AND expires_at IS NULL)
    OR (billing_mode='monthly' AND valid_from IS NOT NULL AND expires_at IS NOT NULL
       AND expires_at=valid_from+interval '30 days'));
COMMIT;
