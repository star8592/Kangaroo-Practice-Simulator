import {test,expect} from "@playwright/test";

test("one payment registry for all modules; private entitlements are never public",async({request})=>{
  const catalog=await request.get("/api/platform/billing/modules");
  expect(catalog.status()).toBe(200);
  const value=await catalog.json() as {
    model:string;checkoutUrl:string;accountUrl:string;
    modules:Array<{id:string;owner:string;fulfillment:string}>;
  };
  expect(value.model).toBe("one-wechat-identity-one-payment-ledger");
  expect(value.checkoutUrl).toBe("/membership");
  expect(value.accountUrl).toBe("/account");
  expect(value.modules.map(m=>m.id)).toEqual([
    "platform","math","pronunciation","vocabulary","reading","aelos",
  ]);
  expect(value.modules.every(m=>m.owner==="socthink")).toBe(true);
  expect(value.modules.filter(m=>m.fulfillment==="not-onboarded").map(m=>m.id))
    .toEqual(["pronunciation","vocabulary","reading","aelos"]);
  expect(JSON.stringify(value)).not.toMatch(/payer_parent_id|out_trade_no|transaction_id|openid/i);

  const owned=await request.get("/api/platform/billing/me");
  expect(owned.status()).toBe(401);
  expect(owned.headers()["cache-control"]).toContain("no-store");
  expect((await owned.json()).code).toBe("WECHAT_LOGIN_REQUIRED");

  const jsapi=await request.get("/api/payments/wechat/jsapi/readiness");
  expect(jsapi.status()).toBe(401);
  expect(jsapi.headers()["cache-control"]).toContain("no-store");

  const owner=await request.post(
    "/api/internal/commerce/vocabulary/organization-owner",{
      data:{organizationId:"a7111111-4444-4444-8888-bbbbbbbbbbbb"},
    });
  expect([401,403]).toContain(owner.status());

  const grants=await request.post(
    "/api/internal/commerce/vocabulary/organization-entitlements",{
      data:{organizationId:"a7111111-4444-4444-8888-bbbbbbbbbbbb"},
    });
  expect([401,403]).toContain(grants.status());
});
