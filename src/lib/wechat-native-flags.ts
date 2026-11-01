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
  return nativeSettlementAllowed(env) &&
    env.SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED==="1";
}
/** A single authenticated buyer and one approved SKU can perform the first
 * real Native checkout while the public checkout switch remains OFF.
 * No account or SKU is hard-coded in Git. The separate pilot flag is OFF
 * unless explicitly set on the production service.
 */
export function nativeCheckoutAllowedForBuyer(
  buyerId:string|undefined|null,
  productId:string|undefined|null,
  env:Readonly<Record<string,string|undefined>>=process.env,
):boolean {
  if(nativeCheckoutAllowed(env))return true;
  if(!nativeSettlementAllowed(env) || env.SOCTHINK_WECHAT_NATIVE_PILOT_ENABLED!=="1")
    return false;
  return Boolean(buyerId && productId &&
    /^par_[a-f0-9]{18}$/.test(buyerId) &&
    /^[A-Za-z0-9_.-]{4,80}$/.test(productId) &&
    buyerId===env.SOCTHINK_WECHAT_NATIVE_PILOT_BUYER_ID &&
    productId===env.SOCTHINK_WECHAT_NATIVE_PILOT_PRODUCT_ID);
}

/** Checkout may be emergency-paused while old paid orders remain fulfillable. */
export function nativeSettlementAllowed(env:Readonly<Record<string,string|undefined>>=process.env):boolean {
  return base(env) && env.SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED==="1";
}
