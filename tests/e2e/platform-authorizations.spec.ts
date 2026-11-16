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

test("authenticated role dashboard isolates teacher A/B and removes revoked module immediately",async({browser,baseURL})=>{
 test.skip(process.env.PLATFORM_E2E_FIXTURE!=="1",
  "Requires an explicit disposable PostgreSQL 18 instance and synthetic user store");
 if(!baseURL)throw new Error("TEST_BASE_URL_REQUIRED");
 const auth=await import("../../src/lib/parent-auth");
 const grants=await import("../../src/lib/platform-grants");
 const teacherA=auth.authenticateOrCreateWechatParent({
  wechatId:"ui-teacher-a-20261116",openId:"ui-a-open-id",
  unionId:"ui-teacher-a-20261116",oauthMode:"website",name:"模拟发音老师",
 });
 const teacherB=auth.authenticateOrCreateWechatParent({
  wechatId:"ui-teacher-b-20261116",openId:"ui-b-open-id",
  unionId:"ui-teacher-b-20261116",oauthMode:"website",name:"模拟单词老师",
 });
 const grantA={subject:teacherA.id,capability:"english.pronunciation",
  role:"teacher" as const,scopeKind:"product" as const,scopeId:"",action:"grant" as const};
 const grantB={subject:teacherB.id,capability:"english.vocabulary",
  role:"teacher" as const,scopeKind:"product" as const,scopeId:"",action:"grant" as const};
 const testActor=teacherA.id;
 let ctxA:Awaited<ReturnType<typeof browser.newContext>>|undefined;
 let ctxB:Awaited<ReturnType<typeof browser.newContext>>|undefined;
 try{
  await grants.updatePlatformGrant(testActor,grantA);
  await grants.updatePlatformGrant(testActor,grantB);
  ctxA=await browser.newContext();
  ctxB=await browser.newContext();
  for(const [ctx,u] of [[ctxA,teacherA],[ctxB,teacherB]] as const){
   await ctx.addCookies([{name:auth.PARENT_SESSION_COOKIE,
    value:auth.createParentSessionToken(u.id),url:baseURL,
    secure:false,httpOnly:true,sameSite:"Lax"}]);
  }
  const pageA=await ctxA.newPage();
  const pageB=await ctxB.newPage();
  await pageA.goto("/workspace");
  await expect(pageA.getByRole("heading",{level:1,name:"我的管理工作台"})).toBeVisible();
  await expect(pageA.getByRole("heading",{level:3,name:"发音训练"})).toBeVisible();
  await expect(pageA.getByRole("heading",{level:3,name:"单词学习"})).toHaveCount(0);
  await pageB.goto("/workspace");
  await expect(pageB.getByRole("heading",{level:3,name:"单词学习"})).toBeVisible();
  await expect(pageB.getByRole("heading",{level:3,name:"发音训练"})).toHaveCount(0);
  await grants.updatePlatformGrant(testActor,{...grantA,action:"revoke"});
  await pageA.reload();
  await expect(pageA.getByText("尚未获得项目管理权限")).toBeVisible();
  await expect(pageA.getByRole("heading",{level:3,name:"发音训练"})).toHaveCount(0);
  await expect(pageB.getByRole("heading",{level:3,name:"单词学习"})).toBeVisible();
 }finally{
  await Promise.allSettled([ctxA?.close(),ctxB?.close()]);
  await Promise.allSettled([
   grants.updatePlatformGrant(testActor,{...grantA,action:"revoke"}),
   grants.updatePlatformGrant(testActor,{...grantB,action:"revoke"}),
  ]);
 }
});
