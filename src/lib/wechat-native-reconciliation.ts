import { billingPool, settleVerifiedOrder } from "./billing-ledger";
import { nativeSettlementAllowed, nativeServerContext } from "./wechat-native-credentials";
import { queryVerifiedWechatNativePayment } from "./wechat-native-transport";
import {
  reconcileOneNativeOrder,
  type PendingNativeOrder,
} from "./wechat-native-reconciliation-core";

type DBOrder = {
  id: string;
  price_minor: string;
  currency: string;
};

/**
 * Single official-query recovery pipeline for all pending Native orders.
 * The normal signed webhook and this worker share settleVerifiedOrder(), not
 * separate ledgers. No external timer is installed by this module.
 */
export async function reconcilePendingNativeOrders(maxOrders = 25) {
  if (!nativeSettlementAllowed()) throw new Error("RECONCILIATION_DISABLED");
  if (!Number.isInteger(maxOrders) || maxOrders < 1 || maxOrders > 50)
    throw new Error("INVALID_RECOVERY_BATCH");
  const ctx = nativeServerContext(process.env, Math.floor(Date.now() / 1000), "reconciliation");
  const client = await billingPool().connect();
  let rows: DBOrder[] = [];
  try {
    await client.query("BEGIN");
    const batch = await client.query<DBOrder>(
      `SELECT id,price_minor,currency
       FROM billing_orders
       WHERE provider='wechat_native' AND state='pending'
         AND (reconcile_checked_at IS NULL OR reconcile_checked_at < now()-interval '2 minutes')
       ORDER BY reconcile_checked_at NULLS FIRST,created_at ASC
       LIMIT $1 FOR UPDATE SKIP LOCKED`, [maxOrders]);
    rows = batch.rows;
    if (rows.length) {
      await client.query(
        "UPDATE billing_orders SET reconcile_checked_at=now() WHERE id=ANY($1::text[])",
        [rows.map(row => row.id)],
      );
    }
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error("RECOVERY_BATCH_NOT_CLAIMED");
  } finally {
    client.release();
  }
  const result = { scanned: 0, settled: 0, notPaid: 0, failed: 0 };
  for (const row of rows) {
    result.scanned++;
    try {
      const snapshot: PendingNativeOrder = {
        id: row.id,
        amountMinor: Number(row.price_minor),
        currency: row.currency as "CNY",
      };
      const r = await reconcileOneNativeOrder(snapshot, {
        query: order => queryVerifiedWechatNativePayment(
          { ...ctx, nowSeconds: Math.floor(Date.now() / 1000) },
          { orderId: order.id, amountMinor: order.amountMinor, currency: "CNY", description: "query-only" }),
        settle: settleVerifiedOrder,
        now: () => new Date(),
      });
      if (r === "SETTLED") result.settled++;
      else result.notPaid++;
    } catch {
      // Bounded retry via reconcile_checked_at, without logging order or keys.
      result.failed++;
    }
  }
  return result;
}
