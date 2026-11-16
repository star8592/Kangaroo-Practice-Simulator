import {expect,test} from "@playwright/test";

test("English homepage keeps six product launches and exposes both role paths",async({page})=>{
  await page.goto("/english");
  await expect(page.getByRole("heading",{level:1,name:"英语学习"})).toBeVisible();
  const roleEntry=page.locator("section").filter({
    has:page.getByRole("heading",{name:"一个入口，进入我的英语课堂"}),
  });
  await expect(roleEntry.locator('a[href="/english/teacher"]')).toBeVisible();
  await expect(roleEntry.locator('a[href="/english/student"]')).toBeVisible();
  await expect(page.getByRole("navigation",{name:"英语学习直达入口"}).locator("article")).toHaveCount(6);
});

test("teacher role hub is one honest entry to all four products and does not invent a teacher entitlement",async({page})=>{
  const result=await page.goto("/english/teacher");
  expect(result?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:"英语教师工作入口"})).toBeVisible();
  await expect(page.getByText("尚未登录主站微信")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link",{name:"微信登录",exact:true}))
    .toHaveAttribute("href","/login?next=%2Fenglish%2Fteacher");
  const nav=page.getByRole("navigation",{name:"教师教学工具"});
  await expect(nav.locator("article")).toHaveCount(4);
  await expect(nav.getByRole("link",{name:/进入发音教学工作台/}))
    .toHaveAttribute("href","/english/pronunciation/app/teacher/homework");
  await expect(nav.getByRole("link",{name:/进入单词教学工作台/}))
    .toHaveAttribute("href","/english/vocabulary/app/teacher/access");
  await expect(nav.getByRole("link",{name:/浏览阅读课程内容/}))
    .toHaveAttribute("href",/^\/english\/reading\/app\/?$/);
  await expect(nav.getByRole("link",{name:/浏览高阶阅读资源/}))
    .toHaveAttribute("href","/english/aelos/app/library");
  await expect(nav.locator("span").filter({hasText:"仅开放内容入口"})).toHaveCount(2);
  await expect(page.locator("main")).toContainText("独立核验授课权限");
  await expect(page.locator("main")).not.toContainText(/全部班级已同步|总平均分|已自动合并学生/);
  await expect(page.locator('link[rel="canonical"]'))
    .toHaveAttribute("href","https://socthink.cn/english/teacher");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("student hub uses original class and practice links without claiming merged grades",async({page})=>{
  const result=await page.goto("/english/student");
  expect(result?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:"我的英语学习"})).toBeVisible();
  await expect(page.getByRole("main").getByRole("link",{name:"微信登录",exact:true}))
    .toHaveAttribute("href","/login?next=%2Fenglish%2Fstudent");
  const nav=page.getByRole("navigation",{name:"学生学习工具"});
  await expect(nav.locator("article")).toHaveCount(4);
  await expect(nav.getByRole("link",{name:/进入我的单词课堂/}))
    .toHaveAttribute("href","/english/vocabulary/app/app/classroom");
  await expect(nav.getByRole("link",{name:/开始发音练习/}))
    .toHaveAttribute("href","/english/pronunciation/app/practice-library");
  await expect(nav.getByRole("link",{name:/打开英语阅读/}))
    .toHaveAttribute("href",/^\/english\/reading\/kids\/?$/);
  await expect(nav.getByRole("link",{name:/进入高阶阅读/}))
    .toHaveAttribute("href","/english/aelos/app/library");
  await expect(page.locator("main")).toContainText("尚未合并");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("the shared WeChat login knows teacher/student hub context rather than a purchase funnel",async({page})=>{
  await page.route("**/api/auth/parent/me",route=>route.fulfill({
    status:401,contentType:"application/json",body:'{"error":"not logged in"}',
  }));
  await page.route("**/api/auth/parent/wechat/qr",route=>route.fulfill({
    status:503,contentType:"application/json",body:'{"error":"isolated test"}',
  }));
  for(const item of [
    {path:"/english/teacher",heading:"微信登录，进入英语教师入口"},
    {path:"/english/student",heading:"微信登录，进入英语学习中心"},
  ]){
    await page.goto("/login?next="+encodeURIComponent(item.path));
    await expect(page.getByRole("heading",{level:1,name:item.heading})).toBeVisible();
    await expect(page.locator("main")).not.toContainText("付款后直接使用");
  }
});
