-- Immutable order-time policy acknowledgement. Existing historical orders
-- remain unchanged; all new Native checkouts require explicit confirmation.
BEGIN;
ALTER TABLE billing_orders
  ADD COLUMN IF NOT EXISTS sales_policy_version text,
  ADD COLUMN IF NOT EXISTS sales_policy_accepted_at timestamptz;
ALTER TABLE billing_orders DROP CONSTRAINT IF EXISTS billing_orders_sales_policy_pair_check;
ALTER TABLE billing_orders ADD CONSTRAINT billing_orders_sales_policy_pair_check CHECK (
  (sales_policy_version IS NULL AND sales_policy_accepted_at IS NULL)
  OR (sales_policy_version IS NOT NULL AND
      length(sales_policy_version) BETWEEN 4 AND 100 AND
      sales_policy_accepted_at IS NOT NULL)
);
-- Prevent silently changing or erasing a customer's original consent
-- after an order is recorded. Historical NULLs remain NULL until legitimately
-- replaced by new purchases, never synthetic backfills.
CREATE OR REPLACE FUNCTION billing_guard_sales_policy_proof()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sales_policy_version IS DISTINCT FROM OLD.sales_policy_version
    OR NEW.sales_policy_accepted_at IS DISTINCT FROM OLD.sales_policy_accepted_at THEN
    RAISE EXCEPTION 'Sales policy confirmation is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS billing_orders_policy_proof_guard ON billing_orders;
CREATE TRIGGER billing_orders_policy_proof_guard
BEFORE UPDATE OF sales_policy_version,sales_policy_accepted_at ON billing_orders
FOR EACH ROW EXECUTE FUNCTION billing_guard_sales_policy_proof();
COMMIT;
