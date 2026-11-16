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
const {PARENT_SESSION_COOKIE,authenticateOrCreateWechatParent,createParentSessionToken}=
 await import("../src/lib/parent-auth");

const c=publicPlatformBillingCatalog();
assert.equal(c.model,"one-wechat-identity-one-payment-ledger");
assert.equal(c.modules.length,6);
assert.deepEqual(c.modules.map(x=>x.id),["platform","math","pronunciation","vocabulary","reading","aelos"]);
assert.deepEqual(c.modules.map(x=>x.owner),Array(6).fill("socthink"));
assert.equal(c.modules.filter(x=>x.fulfillment==="central-settled-items").length,1);
assert.equal(c.modules.filter(x=>x.fulfillment==="central-plan").length,1);
assert.equal(c.modules.filter(x=>x.fulfillment==="not-onboarded").length,4);
assert.equal(platformBillingModule("vocabulary")?.checkoutUrl,"/membership");
assert.equal(platformBillingModule("unrecognized"),null);
assert.equal(c.noNewProductMerchantIntegrations,true);
const result=await catalog();
assert.equal(result.status,200);
assert.equal(result.headers.get("Cache-Control"),"public, max-age=300");
assert.equal((await result.json()).modules.length,6);

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
fs.rmSync(temp,{recursive:true,force:true});
console.log("PLATFORM_BILLING_ONE_LEDGER_CONTRACT_PASS anonymous=401 unconfigured=503 modules=6 no_payment_writes");
