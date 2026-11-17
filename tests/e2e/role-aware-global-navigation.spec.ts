import {expect,test} from "@playwright/test";

/** All privileges are simulated responses from server-owned endpoints.
 * Tests never fabricate a privileged cookie or grant a real user a role.
 */
const buyer={name:"测试微信用户",wechatId:"opaque-test-id"};
async function mockedIdentity(page:import("@playwright/test").Page,owner:boolean,
 modules:Array<{id:string;name:string;managementUrl:string}>=[],workspaceStatus=200){
 await page.route("**/api/auth/parent/me",route=>route.fulfill({
  status:200,contentType:"application/json",
  body:JSON.stringify({user:buyer,siteAdmin:owner}),
 }));
 await page.route("**/api/auth/me",route=>route.fulfill({
  status:401,contentType:"application/json",body:'{"error":"not logged in"}',
 }));
 await page.route("**/api/platform/workspace",route=>route.fulfill({
  status:workspaceStatus,contentType:"application/json",
  body:workspaceStatus===200?JSON.stringify({modules,siteOwner:owner}):'{"code":"PLATFORM_AUTH_UNAVAILABLE"}',
 }));
}

test("site owner sees one-click admin center even if teacher authorization is unavailable",async({page})=>{
 await mockedIdentity(page,true,[],503);
 await page.goto("/");
 const shortcut=page.getByRole("link",{name:"管理中心",exact:true});
 await expect(shortcut).toBeVisible();
 await expect(shortcut).toHaveAttribute("href","/admin");
 await page.getByRole("button",{name:/打开账户与工作空间菜单/}).click();
 await expect(page.getByRole("link",{name:"平台管理中心"})).toHaveAttribute("href","/admin");
 await expect(page.getByRole("link",{name:"浏览网站前台"})).toHaveAttribute("href","/");
 await expect(page.getByRole("link",{name:"模块与教师权限"})).toHaveAttribute("href","/admin/platform-authorizations");
});

test("teacher workspace is visible only with a validated module grant",async({page})=>{
 await mockedIdentity(page,false,[{id:"english.pronunciation",name:"发音教学",managementUrl:"/english/pronunciation/app/teacher/homework"}]);
 await page.goto("/english");
 await expect(page.getByRole("link",{name:"教学工作台",exact:true})).toHaveAttribute("href","/workspace");
 await page.getByRole("button",{name:/打开账户与工作空间菜单/}).click();
 await expect(page.getByRole("link",{name:"我的教学与项目工作台"})).toHaveAttribute("href","/workspace");
 await expect(page.getByRole("link",{name:"平台管理中心"})).toHaveCount(0);
});

test("ordinary WeChat learner gets learner home, not hidden admin privileges",async({page})=>{
 await mockedIdentity(page,false,[]);
 await page.goto("/");
 await expect(page.getByRole("link",{name:"学习中心",exact:true})).toHaveAttribute("href","/my/learning");
 await expect(page.getByRole("link",{name:"管理中心",exact:true})).toHaveCount(0);
 await expect(page.getByRole("link",{name:"教学工作台",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:/打开账户与工作空间菜单/}).click();
 await expect(page.getByRole("link",{name:"平台管理中心"})).toHaveCount(0);
 await expect(page.getByRole("link",{name:"我的教学与项目工作台"})).toHaveCount(0);
 await expect(page.getByRole("link",{name:"我的账号与订单"})).toHaveAttribute("href","/account");
});

test("a 390px owner can reach management without sideways page scrolling",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await mockedIdentity(page,true);
 await page.goto("/");
 await expect(page.getByRole("link",{name:"管理中心",exact:true})).toBeVisible();
 const width=await page.evaluate(()=>({
  page:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth,
 }));
 expect(width.page).toBeLessThanOrEqual(width.viewport+1);
});

test("legacy-only administrator still has a direct management shortcut",async({page})=>{
 await page.route("**/api/auth/parent/me",route=>route.fulfill({
  status:401,contentType:"application/json",body:'{"error":"not logged in"}',
 }));
 await page.route("**/api/auth/me",route=>route.fulfill({
  status:200,contentType:"application/json",body:'{"user":{"name":"Legacy Admin","role":"admin"}}',
 }));
 await page.goto("/");
 await expect(page.getByRole("link",{name:"管理中心",exact:true})).toHaveAttribute("href","/admin");
});
