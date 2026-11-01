import assert from "node:assert/strict";
import {
  aggregateCheckoutCohort, cohortPaidPercent, readAdminCheckoutCohort,
  type CheckoutCohortRow,
} from "../src/lib/admin-checkout-funnel";
import { readStorefrontAvailability } from "../src/lib/store-products";

async function main() {
  assert.equal(cohortPaidPercent(0, 0), "—");
  assert.equal(cohortPaidPercent(0, 4), "0.0%");
  assert.equal(cohortPaidPercent(3, 8), "37.5%");
  assert.equal(cohortPaidPercent(9, 8), "—");
  const rows: CheckoutCohortRow[] = [
    { currency: "CNY", provider: "wechat_native", productKind: "item",
      created: 8, paid: 3, pending: 2, closed: 2, refunded: 1, stalePending: 1 },
    { currency: "CNY", provider: "wechat_native", productKind: "subscription",
      created: 2, paid: 1, pending: 0, closed: 1, refunded: 0, stalePending: 0 },
    { currency: "USD", provider: "wechat_native", productKind: "item",
      created: 3, paid: 3, pending: 0, closed: 0, refunded: 0, stalePending: 0 },
  ];
  const cny = aggregateCheckoutCohort(rows, "CNY");
  assert.deepEqual(cny, { created: 10, paid: 4, pending: 2,
    closed: 3, refunded: 1, stalePending: 1 });
  assert.equal(cohortPaidPercent(cny.paid, cny.created), "40.0%");
  assert.equal(aggregateCheckoutCohort(rows, "JPY").created, 0);

  const previous = process.env.SOCTHINK_BILLING_DATABASE_URL;
  delete process.env.SOCTHINK_BILLING_DATABASE_URL;
  try {
    const funnel = await readAdminCheckoutCohort(30);
    assert.equal(funnel.status, "not_configured");
    assert.equal(funnel.groups.length, 0);
    const shop = await readStorefrontAvailability();
    assert.equal(shop.status, "not_configured");
    assert.equal(shop.visibleItems, null);
  } finally {
    if (previous !== undefined) process.env.SOCTHINK_BILLING_DATABASE_URL = previous;
  }
  console.log("ADMIN_CHECKOUT_COHORT=PASS bounded periods, same-cohort status totals, shop source truth");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
