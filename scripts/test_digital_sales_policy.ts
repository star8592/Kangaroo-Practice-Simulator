import assert from "node:assert/strict";
import {
  DIGITAL_SALES_POLICY_VERSION,
  DIGITAL_SALES_POLICY_SHORT_ZH,
  validDigitalSalesPolicyConsent,
} from "../src/lib/digital-sales-policy";

assert.equal(validDigitalSalesPolicyConsent(null),false);
assert.equal(validDigitalSalesPolicyConsent({}),false);
assert.equal(validDigitalSalesPolicyConsent({
  policyAccepted:false,policyVersion:DIGITAL_SALES_POLICY_VERSION,
}),false);
assert.equal(validDigitalSalesPolicyConsent({
  policyAccepted:"true",policyVersion:DIGITAL_SALES_POLICY_VERSION,
}),false);
assert.equal(validDigitalSalesPolicyConsent({
  policyAccepted:true,policyVersion:"legacy-or-misleading-terms",
}),false);
assert.equal(validDigitalSalesPolicyConsent({
  policyAccepted:true,policyVersion:DIGITAL_SALES_POLICY_VERSION,
}),true);
assert.match(DIGITAL_SALES_POLICY_SHORT_ZH,/不支持.*无理由.*退款/);
assert.match(DIGITAL_SALES_POLICY_SHORT_ZH,/依法/);
console.log("DIGITAL_SALES_POLICY=PASS explicit opt-in current version statutory exception");
