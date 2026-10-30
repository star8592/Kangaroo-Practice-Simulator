import { reconcilePendingNativeOrders } from "../src/lib/wechat-native-reconciliation";
import { closeBillingPoolForTests } from "../src/lib/billing-ledger";

// Operator-installed once per billing service, not a second settlement engine.
async function main() {
  const result = await reconcilePendingNativeOrders(25);
  console.log("WECHAT_NATIVE_RECOVERY", JSON.stringify(result));
  if (result.failed > 0) process.exitCode = 1;
}
main().catch(() => {
  // Never leak provider bodies, merchant details or DB URLs.
  console.error("WECHAT_NATIVE_RECOVERY_UNAVAILABLE");
  process.exitCode = 1;
}).finally(() => closeBillingPoolForTests());
