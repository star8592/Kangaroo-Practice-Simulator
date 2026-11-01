import assert from "node:assert/strict";
import { parseAdminPeriod, formatMinorUnits, readAdminRevenue } from "../src/lib/admin-business-metrics";

async function main() {
  assert.equal(parseAdminPeriod(undefined), 30);
  assert.equal(parseAdminPeriod("7"), 7);
  assert.equal(parseAdminPeriod("30"), 30);
  assert.equal(parseAdminPeriod("90"), 90);
  assert.equal(parseAdminPeriod(["7", "90"]), 7);
  assert.equal(parseAdminPeriod("-1"), 30);
  assert.equal(parseAdminPeriod("9999"), 30);
  assert.equal(formatMinorUnits(100, "CNY"), "¥1.00");
  assert.equal(formatMinorUnits(12345, "CNY"), "¥123.45");
  assert.equal(formatMinorUnits(-1, "CNY"), "—");
  const old = process.env.SOCTHINK_BILLING_DATABASE_URL;
  delete process.env.SOCTHINK_BILLING_DATABASE_URL;
  try {
    const snapshot = await readAdminRevenue(30);
    assert.equal(snapshot.status, "not_configured");
    assert.deepEqual(snapshot.currencies, []);
    assert.deepEqual(snapshot.topProducts, []);
    assert.equal(snapshot.periodDays, 30);
  } finally {
    if (old !== undefined) process.env.SOCTHINK_BILLING_DATABASE_URL = old;
  }
  console.log("ADMIN_COCKPIT_METRICS=PASS verified-only financial data, period bounds, unavailable not zero");
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
