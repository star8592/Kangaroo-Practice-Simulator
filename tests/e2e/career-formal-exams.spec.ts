import {expect,test} from "@playwright/test";

test("24-question career test has a real admission room, timed paper, marked card, review and server result",async({page})=>{
  const id="procurement-paper-2026q4-v1";
  const response=await page.goto("/career/exams/"+id);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:/采购与供应商管理.*A卷/})).toBeVisible();
  await expect(page.getByText("入场须知")).toBeVisible();
  await expect(page.locator("main").last()).toContainText("24");
  await expect(page.locator("main").last()).toContainText("45");
  const enter=page.getByRole("button",{name:"确认入场 · 开始模拟笔试"});
  await expect(enter).toBeDisabled();
  const direct=await page.request.post("/api/career/exam/"+id+"/grade",{
    data:{answers:{"P01":"500"}},
  });
  expect(direct.status()).toBe(403);
  await page.getByRole("checkbox").check();
  await enter.click();
  const exam=page.getByLabel("岗位正式模拟笔试考场");
  await expect(exam).toBeVisible();
  await expect(exam).toContainText("剩余时间");
  await expect(exam).toContainText("45:");
  await expect(page.getByRole("heading",{level:2,name:/某零部件需要490件预计合格品/})).toBeVisible();
  await page.getByRole("textbox",{name:/某零部件需要490件预计合格品/}).fill("500");
  await page.getByRole("button",{name:"标记待检查"}).click();
  await expect(page.getByRole("button",{name:"取消标记"})).toBeVisible();
  await page.getByRole("button",{name:"下一题"}).click();
  await page.getByRole("textbox",{name:/承上题，500件/}).fill("25000");

  await page.reload();
  await expect(exam).toBeVisible();
  await expect(page.getByRole("textbox",{name:/某零部件需要490件预计合格品/}))
    .toHaveValue("500");
  await expect(page.getByRole("button",{name:"取消标记"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    .toBe(true);

  await page.getByRole("button",{name:"检查答卷 / 提前交卷"}).click();
  await expect(page.getByRole("heading",{level:2,name:"交卷前确认"})).toBeVisible();
  await expect(page.locator("main").last()).toContainText("已答 2 题");
  await expect(page.locator("main").last()).toContainText("未答 22 题");
  await page.getByRole("button",{name:"确认交卷 · 查看成绩"}).click();
  await expect(page.getByRole("heading",{level:2,name:"逐题解析"})).toBeVisible();
  await expect(page.locator("main").last()).toContainText("10");
  await expect(page.locator("main").last()).toContainText("已作答 2/24 题");
  await expect(page.locator("main").last()).toContainText("题库版本");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    .toBe(true);

  await page.getByRole("button",{name:"重新入场考一次"}).click();
  await expect(page.getByRole("button",{name:"确认入场 · 开始模拟笔试"})).toBeDisabled();
});

for(const item of [
  {id:"operations-paper-2026q4-v1",title:"商品运营与增长分析"},
  {id:"quality-paper-2026q4-v1",title:"工业质量与FMEA"},
]){
  test(item.title+" supports 24 real questions and blank-paper report",async({page})=>{
    const response=await page.goto("/career/exams/"+item.id);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading",{level:1,name:new RegExp(item.title)})).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button",{name:"确认入场 · 开始模拟笔试"}).click();
    const sheet=page.getByLabel("岗位正式模拟笔试考场");
    await expect(sheet).toContainText("第 1 / 24 题");
    await expect(sheet).toContainText("题目来源：本站原创");
    await expect(sheet).toContainText("编写 2026-11-01");
    await page.getByRole("button",{name:"检查答卷 / 提前交卷"}).click();
    await expect(page.locator("main").last()).toContainText("未答 24 题");
    await page.getByRole("button",{name:"确认交卷 · 查看成绩"}).click();
    await expect(page.getByRole("heading",{level:2,name:"逐题解析"})).toBeVisible();
    await expect(page.locator("main").last()).toContainText("已作答 0/24 题");
    const feedback=page.locator("main").last().locator('article');
    await expect(feedback).toHaveCount(24);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
      .toBe(true);
  });
}

test("career storefront exclusively lists full-length timed exams",async({page})=>{
  const response=await page.goto("/career");
  expect(response?.status()).toBe(200);
  const section=page.locator("#digital-services");
  await expect(section.getByRole("article")).toHaveCount(3);
  await expect(section).toContainText("72道原创题");
  await expect(section).toContainText("24题 / 45分钟");
  const first=section.getByRole("link",{name:"进入考场 · 确认入场"}).first();
  await first.click();
  await expect(page).toHaveURL(/\/career\/exams\/procurement-paper-2026q4-v1$/);
  await expect(page.getByRole("button",{name:"确认入场 · 开始模拟笔试"})).toBeDisabled();
});


test("retired six-question pages and APIs are no longer reachable",async({page})=>{
  const response=await page.goto("/career");
  expect(response?.status()).toBe(200);
  await expect(page.locator("#digital-services")).not.toContainText("6题");
  await expect(page.locator("#digital-services")).not.toContainText("热身");
  for(const id of ["supplier-selection-001","campaign-performance-001","manufacturing-quality-001"]){
    const oldPage=await page.request.get("/career/practice/"+id);
    expect(oldPage.status()).toBe(404);
    const oldScore=await page.request.post("/api/career/practice/"+id+"/grade",{
      data:{answers:{}}});
    expect(oldScore.status()).toBe(404);
  }
  expect((await page.request.get("/api/career/practice/history")).status()).toBe(404);
});

test("mobile career exam keeps question map compact and supports jump to last item",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/career/exams/procurement-paper-2026q4-v1");
  await page.getByRole("checkbox",{name:/我已阅读入场规则/}).check();
  await page.getByRole("button",{name:"确认入场 · 开始模拟笔试"}).click();
  const navigator=page.getByRole("button",{name:/题号导航 · 已答/});
  await expect(navigator).toBeVisible();
  await expect(navigator).toHaveAttribute("aria-expanded","false");
  await navigator.click();
  await expect(navigator).toHaveAttribute("aria-expanded","true");
  await page.getByRole("button",{name:"跳转第24题"}).click();
  await expect(page.getByText("第 24 / 24 题")).toBeVisible();
  await page.getByRole("button",{name:"检查答卷 / 提前交卷"}).click();
  await expect(page.getByRole("heading",{name:"交卷前确认"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
