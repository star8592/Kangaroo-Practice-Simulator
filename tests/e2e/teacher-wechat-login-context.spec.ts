import {expect,test} from "@playwright/test";

/** Existing SOC THINK WeChat sign-in must keep users in their original
 * teacher/student workflow, never display the unrelated checkout funnel.
 */
test.beforeEach(async({page})=>{
  await page.route("**/api/auth/parent/me",route=>
    route.fulfill({status:401,contentType:"application/json",body:'{"error":"not logged in"}'}));
  await page.route("**/api/auth/parent/wechat/qr",route=>
    route.fulfill({status:503,contentType:"application/json",body:'{"error":"isolated fixture"}'}));
});

test("teacher entry uses existing WeChat login with classroom wording",async({page})=>{
  const target="/english/pronunciation/app/teacher/homework";
  await page.goto("/login?next="+encodeURIComponent(target));
  await expect(page.getByRole("heading",{name:"微信登录，进入教师工作台"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"教师微信登录"})).toBeVisible();
  await expect(page.locator("main")).toContainText("无需单独的教师密码");
  await expect(page.locator("main")).toContainText("登录状态有效时直接进入");
  await expect(page.locator("main")).not.toContainText("付款后直接使用");
  await expect(page.getByRole("link",{name:"先浏览英语跟读"})).toHaveAttribute(
    "href",/^\/english\/pronunciation\/app\/?$/);
});

test("WeChat homework invitation shows student task, not a sales page",async({page})=>{
  const target="/english/pronunciation/app/a/"+
    "12345678-1234-8234-8234-123456789abc"+"/"+"a".repeat(64);
  await page.goto("/login?next="+encodeURIComponent(target));
  await expect(page.getByRole("heading",{name:"微信登录，完成英语作业"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"作业微信登录"})).toBeVisible();
  await expect(page.locator("main")).toContainText("自动返回老师布置的作业");
  await expect(page.locator("main")).not.toContainText("付款后直接使用");
});


test("Vocabulary teacher returns to original workspace and sees first-link step",async({page})=>{
  const target="/english/vocabulary/app/teacher/access";
  await page.goto("/login?next="+encodeURIComponent(target));
  await expect(page.getByRole("heading",{name:"微信登录，进入单词教学工作台"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"词语星球教师微信登录"})).toBeVisible();
  await expect(page.locator("main")).toContainText("第一次使用请先通过原教师账号确认身份并关联微信");
  await expect(page.locator("main")).not.toContainText("付款后直接使用");
  await expect(page.getByRole("link",{name:"先浏览词语星球"}))
    .toHaveAttribute("href",/^\/english\/vocabulary\/app\/?$/);
});

test("Vocabulary student returns to original classroom rather than sales funnel",async({page})=>{
  const target="/english/vocabulary/app/app/classroom";
  await page.goto("/login?next="+encodeURIComponent(target));
  await expect(page.getByRole("heading",{name:"微信登录，回到我的单词课堂"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"词语星球学生微信登录"})).toBeVisible();
  await expect(page.locator("main")).toContainText("学习记录和复习进度全部保留");
  await expect(page.locator("main")).not.toContainText("付款后直接使用");
});
