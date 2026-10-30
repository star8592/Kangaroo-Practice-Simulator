import assert from "node:assert/strict";
import {
  canOfferCommerceProduct,commerceChannelErrors,commerceProductErrors,
  type ExamCommerceProduct,type MerchantPaymentCapability,
} from "../src/lib/commerce-product-contract";

const product: ExamCommerceProduct = {
  sku:"mock.ielts.part1.1",revision:1,name:"Synthetic IELTS oral product fixture",
  domain:"language",kind:"oral-mock",delivery:"oral-attempt",
  entitlementRef:"exam-fixture-01",entitlementRevision:1,
  rightsVerified:true,deliveryVerified:true,readiness:"sellable",
  priceMinor:299,currency:"CNY",quotaUnits:1,
};
const provider:MerchantPaymentCapability = {
  channel:"alipay_page",
  merchantVerified:true,productContractApproved:true,
  callbackAndQueryVerified:true,refundsVerified:true,
  billingReconciliationVerified:true,saleSurfaceApproved:true,
  verifiedAt:"2026-10-30T05:30:00Z",
  verificationRef:"synthetic-verification-reference-only",
};
// These are in-memory synthetic fixtures, never real payment approvals.
const ok=canOfferCommerceProduct(product,provider,"pc-web");
assert.equal(ok.allowed,true);
assert.equal(ok.reasons.length,0);
assert.equal(canOfferCommerceProduct(product,provider,"wechat-miniapp").allowed,false);
assert.ok(commerceChannelErrors(provider,"wechat-miniapp").includes("channel-wrong-surface"));
assert.ok(commerceProductErrors({...product,readiness:"preview"}).includes("product-not-sellable"));
assert.ok(commerceProductErrors({...product,rightsVerified:false}).includes("rights-unverified"));
assert.ok(commerceProductErrors({...product,deliveryVerified:false}).includes("delivery-unverified"));
assert.ok(commerceProductErrors({...product,priceMinor:undefined}).includes("invalid-server-price"));
assert.ok(commerceProductErrors({...product,priceMinor:0}).includes("invalid-server-price"));
assert.ok(commerceProductErrors({...product,quotaUnits:0}).includes("missing-cost-budget"));
assert.ok(commerceProductErrors({...product,kind:"practical-sandbox"}).includes("mismatched-delivery"));
assert.ok(commerceChannelErrors({...provider,callbackAndQueryVerified:false},"pc-web")
  .includes("real-payment-chain-unverified"));
assert.ok(commerceChannelErrors({...provider,productContractApproved:false},"pc-web")
  .includes("provider-product-not-approved"));
assert.ok(commerceChannelErrors({...provider,verificationRef:undefined},"pc-web")
  .includes("missing-provider-verification-evidence"));
for(const channel of ["wechat_native","wechat_jsapi","wechat_h5","wechat_virtual","alipay_page","alipay_wap"] as const) {
  const surface=channel==="wechat_native"||channel==="alipay_page"?"pc-web":
    channel==="wechat_jsapi"?"wechat-web":
    channel==="wechat_virtual"?"wechat-miniapp":"mobile-web";
  const capability={...provider,channel};
  assert.equal(canOfferCommerceProduct(product,capability,surface).allowed,true,channel);
}
assert.equal(canOfferCommerceProduct(product,{...provider,channel:"alipay_page"},"wechat-miniapp").allowed,false);
assert.equal(canOfferCommerceProduct(product,{...provider,channel:"wechat_native"},"wechat-miniapp").allowed,false);
console.log("COMMERCE_PRODUCT_CONTRACT=PASS (SKU, immutable price, costs, verified channels, miniapp separation)");
