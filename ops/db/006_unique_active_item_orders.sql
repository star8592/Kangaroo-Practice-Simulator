-- Exactly one payable order or paid entitlement per buyer + content item.
-- Prevents two concurrent/abandoned QR checkouts from charging for the
-- same digital content. Once an order is officially CLOSED or REFUNDED, a
-- buyer may open another order. Existing duplicates make this migration
-- fail for operator reconciliation; NEVER auto-delete paid transactions.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS billing_item_one_payable_order_idx
  ON billing_orders (payer_parent_id,content_kind,content_id)
  WHERE product_kind='item' AND state IN ('pending','paid');
COMMIT;
