import { billingConfigured, billingPool } from "@/lib/billing-ledger";
import type { AdminPeriod } from "@/lib/admin-business-metrics";

/**
 * A created-order cohort, NOT session/pageview conversion.
 * These are current order states for orders created in the requested period.
 * Refunds and late settlement can change historical cohort outcomes.
 */
export type CheckoutCohortRow = Readonly<{
  currency: string;
  provider: string;
  productKind: string;
  created: number;
  paid: number;
  pending: number;
  closed: number;
  refunded: number;
  stalePending: number;
}>;
export type CheckoutCohortSnapshot = Readonly<{
  status: "available" | "unavailable" | "not_configured";
  observedAt: string;
  days: AdminPeriod;
  groups: CheckoutCohortRow[];
}>;
type DbRow = {
  currency: string;
  provider: string;
  product_kind: string;
  created: string;
  paid: string;
  pending: string;
  closed: string;
  refunded: string;
  stale_pending: string;
};
function safeCount(raw: string): number {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid payment cohort count");
  return n;
}
export function cohortPaidPercent(paid: number, created: number): string {
  if (!Number.isSafeInteger(created) || created <= 0 ||
      !Number.isSafeInteger(paid) || paid < 0 || paid > created) return "—";
  return (100 * paid / created).toFixed(1) + "%";
}
export function aggregateCheckoutCohort(groups: readonly CheckoutCohortRow[], currency: string) {
  return groups.filter(row => row.currency === currency).reduce((sum, row) => ({
    created: sum.created + row.created,
    paid: sum.paid + row.paid,
    pending: sum.pending + row.pending,
    closed: sum.closed + row.closed,
    refunded: sum.refunded + row.refunded,
    stalePending: sum.stalePending + row.stalePending,
  }), { created: 0, paid: 0, pending: 0, closed: 0, refunded: 0, stalePending: 0 });
}
export async function readAdminCheckoutCohort(days: AdminPeriod, now = new Date()): Promise<CheckoutCohortSnapshot> {
  if (![7, 30, 90].includes(days) || !Number.isFinite(now.getTime())) throw new Error("Invalid cohort period");
  const observedAt = now.toISOString();
  if (!billingConfigured()) return { status: "not_configured", observedAt, days, groups: [] };
  const start = new Date(now.getTime() - days * 86_400_000);
  const staleCutoff = new Date(now.getTime() - 24 * 3_600_000);
  try {
    const result = await billingPool().query<DbRow>(
      `SELECT currency, provider, product_kind,
        COUNT(*)::text AS created,
        COUNT(*) FILTER (WHERE state='paid')::text AS paid,
        COUNT(*) FILTER (WHERE state='pending')::text AS pending,
        COUNT(*) FILTER (WHERE state='closed')::text AS closed,
        COUNT(*) FILTER (WHERE state='refunded')::text AS refunded,
        COUNT(*) FILTER (WHERE state='pending' AND created_at < $3)::text AS stale_pending
      FROM billing_orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY currency,provider,product_kind ORDER BY currency,provider,product_kind`,
      [start, now, staleCutoff],
    );
    const groups = result.rows.map(row => ({
      currency: row.currency,
      provider: row.provider,
      productKind: row.product_kind,
      created: safeCount(row.created),
      paid: safeCount(row.paid),
      pending: safeCount(row.pending),
      closed: safeCount(row.closed),
      refunded: safeCount(row.refunded),
      stalePending: safeCount(row.stale_pending),
    }));
    if (groups.some(row =>
      row.paid + row.pending + row.closed + row.refunded !== row.created ||
      row.stalePending > row.pending)) throw new Error("Order cohort inconsistent states");
    return { status: "available", observedAt, days, groups };
  } catch {
    // Query failures must never look like a genuine 0%-conversion cohort.
    return { status: "unavailable", observedAt, days, groups: [] };
  }
}
