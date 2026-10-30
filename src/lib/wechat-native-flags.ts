/** Pure merchant authorization flags. No keys, production API or DB access.
 * Operator-verifiable product approval is independent from the runtime gate.
 * FALSE by default; tests must never turn this on in a running service.
 */
function base(env:Readonly<Record<string,string|undefined>>):boolean {
  return env.SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED==="1" &&
    env.PAYMENT_PROVIDER==="wechat_native" &&
    env.SOCTHINK_PAYMENT_SURFACE==="web-native" &&
    Boolean(env.SOCTHINK_BILLING_DATABASE_URL) &&
    Boolean(env.SOCTHINK_PUBLIC_ORIGIN);
}
export function nativeCheckoutAllowed(env:Readonly<Record<string,string|undefined>>=process.env):boolean {
  return base(env) && env.SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED==="1";
}
/** Checkout may be emergency-paused while old paid orders remain fulfillable. */
export function nativeSettlementAllowed(env:Readonly<Record<string,string|undefined>>=process.env):boolean {
  return base(env) && env.SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED==="1";
}
