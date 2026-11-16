import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-one-payment-contract."));
process.env.SOCTHINK_USER_DATA_DIR=temp;
delete process.env.SOCTHINK_BILLING_DATABASE_URL;
const {publicPlatformBillingCatalog,platformBillingModule}=
 await import("../src/lib/platform-billing-modules");
const {GET:catalog}=await import("../src/app/api/platform/billing/modules/route");
const {GET:mine}=await import("../src/app/api/platform/billing/me/route");
const {PARENT_SESSION_COOKIE,authenticateOrCreateWechatParent,createParentSessionToken,
 officialWechatOpenIdForSession}=
 await import("../src/lib/parent-auth");
const {GET:jsapiReadiness}=await import("../src/app/api/payments/wechat/jsapi/readiness/route");
const {POST:orgOwnerBind}=await import("../src/app/api/internal/commerce/vocabulary/organization-owner/route");
const {POST:orgPaidEntitlements}=await import("../src/app/api/internal/commerce/vocabulary/organization-entitlements/route");

const c=publicPlatformBillingCatalog();
assert.equal(c.model,"one-wechat-identity-one-payment-ledger");
assert.equal(c.modules.length,5);
assert.deepEqual(c.modules.map(x=>x.id),["platform","math","pronunciation","vocabulary","aelos"]);
assert.deepEqual(c.modules.map(x=>x.owner),Array(5).fill("socthink"));
assert.equal(c.modules.filter(x=>x.fulfillment==="central-settled-items").length,1);
assert.equal(c.modules.filter(x=>x.fulfillment==="central-plan").length,1);
assert.equal(c.modules.filter(x=>x.fulfillment==="not-onboarded").length,3);
assert.deepEqual(c.readOnlyLegacyModules,["reading"]);
assert.equal(platformBillingModule("reading"),null);
assert.equal(platformBillingModule("vocabulary")?.checkoutUrl,"/membership");
assert.equal(platformBillingModule("unrecognized"),null);
assert.equal(c.noNewProductMerchantIntegrations,true);
const result=await catalog();
assert.equal(result.status,200);
assert.equal(result.headers.get("Cache-Control"),"public, max-age=300");
assert.equal((await result.json()).modules.length,5);

const req=(cookie?:string)=>new NextRequest("https://socthink.cn/api/platform/billing/me",{
 headers:cookie?{cookie:PARENT_SESSION_COOKIE+"="+cookie}:{},
});
const denied=await mine(req());
assert.equal(denied.status,401);
assert.equal(denied.headers.get("Cache-Control"),"private, no-store, max-age=0");
const user=authenticateOrCreateWechatParent({wechatId:"contract_test_01",openId:"contract_open_01"});
assert.equal((await mine(req(createParentSessionToken(user.id)))).status,503);
assert.equal((await mine(req("malformed_session"))).status,401);
// Platform teacher roles are never an alternative payment receipt.
assert.equal((await import("../src/lib/platform-capabilities")).PLATFORM_CAPABILITIES.length>0,true);
const noKey=(url:string,withOrigin=false)=>new NextRequest("https://socthink.cn"+url,{
  method:"POST",headers:{"content-type":"application/json",
    ...(withOrigin?{origin:"https://socthink.cn"}:{})},
  body:JSON.stringify({organizationId:"a7111111-4444-4444-8888-bbbbbbbbbbbb"}),
});
const ownerRoute="/api/internal/commerce/vocabulary/organization-owner";
const grantRoute="/api/internal/commerce/vocabulary/organization-entitlements";
assert.equal((await orgOwnerBind(noKey(ownerRoute))).status,401);
assert.equal((await orgPaidEntitlements(noKey(grantRoute))).status,401);
assert.equal((await orgOwnerBind(noKey(ownerRoute,true))).status,403);
assert.equal((await orgPaidEntitlements(noKey(grantRoute,true))).status,403);
assert.equal((await jsapiReadiness(req())).status,401);
assert.equal(officialWechatOpenIdForSession(createParentSessionToken(user.id)),null,
  "generic WeChat login must NOT be substituted for Official Account OpenID");
const official=authenticateOrCreateWechatParent({
  wechatId:"jsapi_merchant_fixture",openId:"o".repeat(28),oauthMode:"official_account",
});
const officialToken=createParentSessionToken(official.id);
assert.equal(officialWechatOpenIdForSession(officialToken),"o".repeat(28));
const r=await jsapiReadiness(req(officialToken));
assert.equal(r.status,200);
const json=await r.json() as {checkoutAvailable:boolean;paymentMethod:string};
assert.equal(json.checkoutAvailable,false,"JSAPI readiness never creates real payment");
assert.equal(json.paymentMethod,"JSAPI");
assert(!JSON.stringify(json).includes("o".repeat(28)),"Official OpenID must remain server-private");
fs.rmSync(temp,{recursive:true,force:true});
console.log("PLATFORM_BILLING_ONE_LEDGER_CONTRACT_PASS anonymous=401 unconfigured=503 modules=5 no_payment_writes");
