import assert from "node:assert/strict";
import {nativeCheckoutAllowed,nativeSettlementAllowed} from "../src/lib/wechat-native-flags";

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
console.log("WECHAT_NATIVE_FEATURE_FLAGS=PASS (fail closed; independent checkout stop and settlement)");
