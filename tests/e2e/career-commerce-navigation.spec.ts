import {expect,test} from "@playwright/test";

test("career home puts real goods and exams first, then navigates 13 industries and 270 roles",async({page})=>{
  const response=await page.goto("/career");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:/要复习资料？还是要模拟考试？/})).toBeVisible();
  const primaryGoods=page.getByRole("link",{name:/找资料 · 免费领取/});
  const primaryExam=page.getByRole("link",{name:/做模拟考试 · 立即开始/});
  await expect(primaryGoods).toBeVisible();
  await expect(primaryExam).toBeVisible();
  if(page.viewportSize()!.width<=920){
    const fastGoods=page.getByRole("link",{name:/^找复习资料/});
    const fastExam=page.getByRole("link",{name:"做模拟考试",exact:true});
    await expect(fastGoods).toBeVisible();
    await expect(fastExam).toBeVisible();
    for(const action of [fastGoods,fastExam]){
      const box=await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeLessThan(page.viewportSize()!.height-20);
      expect(box!.height).toBeGreaterThanOrEqual(50);
    }
  }

  await expect(page.getByRole("heading",{level:2,name:"职业教程与复习资料"})).toBeVisible();
  await expect(page.getByRole("heading",{level:2,name:"模拟考试与自动评分"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  await primaryGoods.click();
  await expect(page).toHaveURL(/#digital-materials$/);
  await expect(page.locator("#digital-materials").getByRole("article")).toHaveCount(3);
  await primaryExam.click();
  await expect(page).toHaveURL(/#digital-services$/);
  await expect(page.locator("#digital-services").getByRole("article")).toHaveCount(3);

  const directory=page.locator("#career-directory");
  await expect(directory).toBeVisible();
  await expect(directory).toContainText("270");
  await expect(directory.locator("button[aria-pressed]")).toHaveCount(14);
  await expect(directory.locator("article")).toHaveCount(13);
  const industry=directory.getByRole("button",{name:/制造业与工业工程/});
  await industry.click();
  await expect(industry).toHaveAttribute("aria-pressed","true");
  await expect(directory.getByRole("heading",{name:"工业质量与可靠性"})).toBeVisible();

  const filter=directory.getByRole("searchbox",{name:"搜索具体岗位"});
  await filter.fill("质量工程师");
  const direct=directory.getByRole("link",{name:/^质量工程师/});
  await expect(direct).toBeVisible();
  await direct.click();
  await expect(page).toHaveURL(/\/career\/roles\/industry-02-01$/);
  await expect(page.getByRole("heading",{level:1,name:"质量工程师"})).toBeVisible();
  await expect(page.getByRole("link",{name:"免费阅读并下载"})).toBeVisible();
  await expect(page.getByRole("link",{name:"免费进入模拟考试"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  await page.getByRole("link",{name:"免费进入模拟考试"}).click();
  await expect(page).toHaveURL(/\/career\/practice\/manufacturing-quality-001$/);
  await expect(page.getByRole("button",{name:"提交答卷并查看报告"})).toBeVisible();
});
