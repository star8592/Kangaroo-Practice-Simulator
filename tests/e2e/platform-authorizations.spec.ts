import {expect,test} from "@playwright/test";

test("platform workbench requires a current main WeChat account",async({page})=>{
 await page.route("**/api/auth/parent/me",route=>route.fulfill({
  status:401,contentType:"application/json",body:'{"error":"not logged in"}',
 }));
 await page.route("**/api/auth/parent/wechat/qr",route=>route.fulfill({
  status:503,contentType:"application/json",body:'{"error":"isolated fixture"}',
 }));
 await page.goto("/workspace");
 await expect(page).toHaveURL(/\/login\?next=%2Fworkspace/);
});

test("platform grant administration is not a public page",async({page})=>{
 await page.goto("/admin/platform-authorizations");
 await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fplatform-authorizations/);
});

test("unauthenticated platform APIs reject access, and server-only verifier requires backend key",async({request})=>{
 const workspace=await request.get("/api/platform/workspace");
 expect(workspace.status()).toBe(401);
 const users=await request.get("/api/platform/admin/accounts?q=somebody");
 expect(users.status()).toBe(401);
 const grants=await request.get("/api/platform/admin/grants?subject=par_"+"a".repeat(18));
 expect(grants.status()).toBe(401);
 const server=await request.post("/api/platform/authorization/verify",{
  data:{product:"vocabulary"},headers:{"Content-Type":"application/json"},
 });
 // Public browser requests carry Origin; even a server-origin request without
 // the secret must fail. Neither case exposes any user or classroom records.
 expect([401,403]).toContain(server.status());
});
