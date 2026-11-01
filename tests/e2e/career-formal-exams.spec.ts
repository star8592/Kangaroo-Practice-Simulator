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
  const direct=await page.request.post("/api/career/practice/"+id+"/grade",{
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

test("career storefront prominently exposes timed standard papers separately from short warmups",async({page})=>{
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
