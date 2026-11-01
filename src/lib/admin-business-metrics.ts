import { billingConfigured, billingPool } from "@/lib/billing-ledger";

/**
 * Read-only roll-up of the ONE verified payment ledger.
 * Revenue is never inferred from pageviews, submitted QR codes or SEO traffic.
 * The figure is a payment-order operating metric, not GAAP revenue recognition.
 */
export type AdminMoneyMetric = Readonly<{
  currency: string;
  paidOrders: number;
  paidBuyers: number;
  paidMinor: number;
  pendingOrders: number;
  refundOrders: number;
  refundMinor: number;
}>;
export type AdminRevenueDay = Readonly<{
  day: string;
  currency: string;
  paidMinor: number;
  paidOrders: number;
}>;
export type AdminTopProduct = Readonly<{ productId: string; title: string; currency: string; paidOrders: number; paidMinor: number }>;
export type AdminProductStatus = Readonly<{
  kind: string;
  total: number;
  enabled: number;
  configuredForDelivery: number;
}>;
export type AdminRevenueSnapshot =
  | Readonly<{ status: "not_configured" | "unavailable"; asOf: string; periodDays: number; currencies: []; daily: []; products: []; topProducts: [] }>
  | Readonly<{ status: "available"; asOf: string; periodDays: number;
    currencies: AdminMoneyMetric[]; daily: AdminRevenueDay[]; products: AdminProductStatus[]; topProducts: AdminTopProduct[] }>;

const PERIODS = [7, 30, 90] as const;
export type AdminPeriod = typeof PERIODS[number];

export function parseAdminPeriod(value: string | string[] | undefined): AdminPeriod {
  const s = Array.isArray(value) ? value[0] : value;
  return s === "7" ? 7 : s === "90" ? 90 : 30;
}

type MoneyRow = {
  currency: string;
  paid_orders: string;
  paid_buyers: string;
  paid_minor: string;
  pending_orders: string;
  refund_orders: string;
  refund_minor: string;
};
type DayRow = { day: string; currency: string; paid_minor: string; paid_orders: string };
type ProductRow = { kind: string; total: string; enabled: string; configured_for_delivery: string };
type TopRow = { product_id: string; title: string | null; currency: string; paid_orders: string; paid_minor: string };

function asNonnegativeInteger(value: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Billing metric exceeds safe integer range");
  return n;
}

/** All SQL statements are strictly SELECTs; no buyer identifiers or individual order IDs leave this function. */
export async function readAdminRevenue(periodDays: AdminPeriod, now = new Date()): Promise<AdminRevenueSnapshot> {
  if (!PERIODS.includes(periodDays) || !Number.isFinite(now.getTime())) throw new Error("Invalid revenue report time");
  const asOf = now.toISOString();
  if (!billingConfigured()) {
    return { status: "not_configured", asOf, periodDays, currencies: [], daily: [], products: [], topProducts: [] };
  }
  const since = new Date(now.getTime() - periodDays * 86_400_000);
  try {
    const [money, daily, products, topProducts] = await Promise.all([
      billingPool().query<MoneyRow>(
        `SELECT currency,
          COUNT(*) FILTER (WHERE state='paid' AND paid_at >= $1)::text AS paid_orders,
          COUNT(DISTINCT payer_parent_id) FILTER (WHERE state='paid' AND paid_at >= $1)::text AS paid_buyers,
          COALESCE(SUM(price_minor) FILTER (WHERE state='paid' AND paid_at >= $1),0)::text AS paid_minor,
          COUNT(*) FILTER (WHERE state='pending' AND created_at >= $1)::text AS pending_orders,
          COUNT(*) FILTER (WHERE state='refunded' AND refunded_at >= $1)::text AS refund_orders,
          COALESCE(SUM(price_minor) FILTER (WHERE state='refunded' AND refunded_at >= $1),0)::text AS refund_minor
        FROM billing_orders
        WHERE created_at >= $1 OR paid_at >= $1 OR refunded_at >= $1
        GROUP BY currency ORDER BY currency`, [since]),
      billingPool().query<DayRow>(
        `SELECT to_char(paid_at AT TIME ZONE 'Asia/Shanghai','YYYY-MM-DD') AS day,
          currency, COALESCE(SUM(price_minor),0)::text AS paid_minor, COUNT(*)::text AS paid_orders
        FROM billing_orders
        WHERE state='paid' AND paid_at >= $1 AND paid_at <= $2
        GROUP BY 1,2 ORDER BY 1,2`, [since, now]),
      billingPool().query<ProductRow>(
        `SELECT product_kind AS kind,
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE enabled=true)::text AS enabled,
          COUNT(*) FILTER (WHERE enabled=true AND (product_kind='subscription'
             OR (product_kind='item' AND rights_approved=true AND delivery_verified=true
               AND access_restricted=true)))::text AS configured_for_delivery
        FROM billing_products GROUP BY product_kind ORDER BY product_kind`),
      billingPool().query<TopRow>(
        `SELECT product_id, MAX(title_snapshot) AS title, currency,
          COUNT(*)::text AS paid_orders, COALESCE(SUM(price_minor),0)::text AS paid_minor
        FROM billing_orders WHERE state='paid' AND paid_at >= $1 AND paid_at <= $2
        GROUP BY product_id,currency ORDER BY SUM(price_minor) DESC LIMIT 8`, [since, now]),
    ]);
    return {
      status: "available", asOf, periodDays,
      currencies: money.rows.map(row => ({
        currency: row.currency,
        paidOrders: asNonnegativeInteger(row.paid_orders),
        paidBuyers: asNonnegativeInteger(row.paid_buyers),
        paidMinor: asNonnegativeInteger(row.paid_minor),
        pendingOrders: asNonnegativeInteger(row.pending_orders),
        refundOrders: asNonnegativeInteger(row.refund_orders),
        refundMinor: asNonnegativeInteger(row.refund_minor),
      })),
      daily: daily.rows.map(row => ({
        day: row.day,
        currency: row.currency,
        paidMinor: asNonnegativeInteger(row.paid_minor),
        paidOrders: asNonnegativeInteger(row.paid_orders),
      })),
      products: products.rows.map(row => ({
        kind: row.kind, total: asNonnegativeInteger(row.total),
        enabled: asNonnegativeInteger(row.enabled),
        configuredForDelivery: asNonnegativeInteger(row.configured_for_delivery),
      })),
      topProducts: topProducts.rows.map(row => ({
        productId: row.product_id, title: row.title?.trim() || row.product_id,
        currency: row.currency, paidOrders: asNonnegativeInteger(row.paid_orders),
        paidMinor: asNonnegativeInteger(row.paid_minor),
      })),
    };
  } catch {
    // Never turn DB errors into fabricated zero-revenue KPIs.
    return { status: "unavailable", asOf, periodDays, currencies: [], daily: [], products: [], topProducts: [] };
  }
}

export function formatMinorUnits(minor: number, currency = "CNY") {
  if (!Number.isSafeInteger(minor) || minor < 0) return "—";
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency", currency, maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}
