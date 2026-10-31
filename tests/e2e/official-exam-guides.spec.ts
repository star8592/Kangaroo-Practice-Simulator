import {test,expect} from "@playwright/test";

test("official rules and source links are discoverable without fake paid papers",async({page})=>{
  await page.goto("/assessments");
  await page.getByRole("link",{name:"考试规则与官方来源"}).click();
  await expect(page).toHaveURL(/\/exam-guides$/);
  await expect(page.getByRole("heading",{name:"考试规则与官方来源"})).toBeVisible();
  const cards=page.locator("main article");
  await expect(cards).toHaveCount(5);
  await expect(page.getByRole("heading",{name:/托福 TOEFL iBT/})).toBeVisible();
  await expect(page.getByText("2026 年 1 月 21 日起采用 1–6 分段分数和总分",{exact:false})).toBeVisible();
  await expect(page.getByText("2026 年 12 月 19—20 日",{exact:false})).toBeVisible();
  await expect(page.locator('a[href="https://www.ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test"]')).toBeVisible();
  await expect(page.locator('a[href="https://legalinfo.moj.gov.cn/zhfxfzzx/fzzxyw/202609/t20260920_539941.html"]')).toBeVisible();
  expect(await page.locator('main a[href^="/exam/"]').count()).toBe(0);
  expect(await page.locator('main button').count()).toBe(0);
});

test("official guide pages are readable on mobile and do not overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto("/exam-guides");
  expect(response?.status()).toBe(200);
  await expect(page.locator("main article")).toHaveCount(5);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
