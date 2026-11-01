import assert from "node:assert/strict";
import {nativeCheckoutAllowed,nativeCheckoutAllowedForBuyer,nativeSettlementAllowed} from "../src/lib/wechat-native-flags";

const base={
  PAYMENT_PROVIDER:"wechat_native",
  SOCTHINK_PAYMENT_SURFACE:"web-native",
  SOCTHINK_BILLING_DATABASE_URL:"synthetic_pg_only",
  SOCTHINK_PUBLIC_ORIGIN:"https://example.test",
  SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED:"1",
  SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED:"1",
  SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED:"1",
};
assert.equal(nativeCheckoutAllowed({}),false);
assert.equal(nativeSettlementAllowed({}),false);
assert.equal(nativeCheckoutAllowed(base),true);
assert.equal(nativeSettlementAllowed(base),true);
for(const k of Object.keys(base)){
  const value={...base};
  delete (value as Record<string,string|undefined>)[k];
  if (k==="SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED"){
    assert.equal(nativeCheckoutAllowed(value),false);
    assert.equal(nativeSettlementAllowed(value),true,
      "Emergency stop must not abandon preexisting paid orders");
  } else if(k==="SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED"){
    assert.equal(nativeCheckoutAllowed(value),false,
      "Do not accept charges when settlement callbacks are disabled");
    assert.equal(nativeSettlementAllowed(value),false);
  } else {
    assert.equal(nativeCheckoutAllowed(value),false,k);
    assert.equal(nativeSettlementAllowed(value),false,k);
  }
}
assert.equal(nativeCheckoutAllowed({...base,PAYMENT_PROVIDER:"wechat_virtual"}),false);
assert.equal(nativeSettlementAllowed({...base,SOCTHINK_PAYMENT_SURFACE:"miniapp-virtual"}),false);
assert.equal(nativeCheckoutAllowed({...base,SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED:"true"}),false);

// First real-money trial is permitted only for the exact server-side account
// AND exact approved SKU, with public charges explicitly disabled.
const pilotBuyer="par_1234567890abcdef12";
const pilotSku="socthink_g1_original_2026_batch01";
const off={...base,SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED:"0"};
const pilot={
  ...off,
  SOCTHINK_WECHAT_NATIVE_PILOT_ENABLED:"1",
  SOCTHINK_WECHAT_NATIVE_PILOT_BUYER_ID:pilotBuyer,
  SOCTHINK_WECHAT_NATIVE_PILOT_PRODUCT_ID:pilotSku,
};
assert.equal(nativeCheckoutAllowed(pilot),false,"public buyer checkout must remain off");
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,pilot),true);
assert.equal(nativeCheckoutAllowedForBuyer("par_999999999999999999",pilotSku,pilot),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,"socthink_g2_original_2026_batch01",pilot),false);
assert.equal(nativeCheckoutAllowedForBuyer(undefined,pilotSku,pilot),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,undefined,pilot),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,off),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,
  {...pilot,SOCTHINK_WECHAT_NATIVE_PILOT_ENABLED:"0"}),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,
  {...pilot,SOCTHINK_WECHAT_NATIVE_PILOT_BUYER_ID:""}),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,
  {...pilot,SOCTHINK_WECHAT_NATIVE_PILOT_PRODUCT_ID:""}),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,
  {...pilot,SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED:"0"}),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,
  {...pilot,SOCTHINK_WECHAT_NATIVE_PRODUCT_APPROVED:"0"}),false);
assert.equal(nativeCheckoutAllowedForBuyer("par_wrong",pilotSku,pilot),false);
assert.equal(nativeCheckoutAllowedForBuyer(pilotBuyer,pilotSku,base),true,
  "explicitly opened public checkout must retain existing behavior");
console.log("WECHAT_NATIVE_ONE_BUYER_PILOT=PASS (public stays off, buyer+SKU exact)");

console.log("WECHAT_NATIVE_FEATURE_FLAGS=PASS (fail closed; independent checkout stop and settlement)");
