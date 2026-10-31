import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {
  DIGITAL_SALES_POLICY_VERSION,
  PREVIOUS_DIGITAL_SALES_POLICY_VERSION,
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
assert.match(DIGITAL_SALES_POLICY_SHORT_ZH,/依法|法律/);
assert.match(DIGITAL_SALES_POLICY_SHORT_ZH,/不提供用户自助退款/);
assert.match(DIGITAL_SALES_POLICY_SHORT_ZH,/预付服务/);
assert.notEqual(DIGITAL_SALES_POLICY_VERSION,PREVIOUS_DIGITAL_SALES_POLICY_VERSION);
assert.equal(validDigitalSalesPolicyConsent({
  policyAccepted:true,policyVersion:PREVIOUS_DIGITAL_SALES_POLICY_VERSION,
}),false,"Old terms must not be accepted as the current disclosure");
const historic=readFileSync("src/app/digital-purchase-policy/v1/page.tsx","utf8");
const original=readFileSync("docs/legal/DIGITAL_SALES_POLICY_V1_20261031.md","utf8");
assert.match(historic,/不支持因买错、改变主意、已查看或已下载/);
assert.match(original,/digital-delivery-no-reason-v1-2026-10-31/);
assert.match(readFileSync("docs/legal/DIGITAL_SALES_POLICY_V2_20261031.md","utf8"),/不提供普通用户自助退款/);
assert.match(readFileSync("src/app/digital-purchase-policy/page.tsx","utf8"),/\/digital-purchase-policy\/v1/);
for(const file of [
  "src/app/api/payments/wechat/refund/route.ts",
  "src/app/api/payments/wechat/refunds/route.ts",
  "src/app/api/refunds/route.ts",
  "src/app/api/refund/route.ts",
]) {
  assert.equal(existsSync(file),false,"No consumer refund API: "+file);
}
assert.match(readFileSync("ops/payment/PRODUCTION_ACTIVATION.md","utf8"),
  /不要求普通自助退款系统或测试退款作为正常收费上线门槛/);
console.log("DIGITAL_SALES_POLICY=PASS no change-of-mind refunds no customer self-service V1 archive preserved explicit V2 opt-in statutory exception");
