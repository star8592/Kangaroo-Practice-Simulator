import {expect,test} from "@playwright/test";

/** Market figures and product availability are intentionally separate.
 * Exercise scoring is covered by career-practice.spec.ts.
 */
test("market growth, original materials and online service are real user journeys",async({page})=>{
  const catalog=await page.goto("/career");
  expect(catalog?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:/岗位热度/})).toBeVisible();

  const market=page.locator("#market-heat");
  await expect(market).toContainText("数据工程师");
  await expect(market).toContainText("+57.4%");
  await expect(market).toContainText("人工智能工程师");
  await expect(market).toContainText("+36.9%");
  await expect(market).toContainText("应届职位数同比");

  const goods=page.locator("#digital-materials");
  const services=page.locator("#digital-services");
  await expect(goods.getByRole("article")).toHaveCount(3);
  await expect(services.getByRole("article")).toHaveCount(3);
  await expect(goods).toContainText("免费完整领取");
  await expect(services).toContainText("免费开始");
  await expect(page.locator("main")).toContainText("暂无可比数据");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  const original=goods.getByRole("link",{name:"阅读完整教程"}).first();
  await original.click();
  await expect(page).toHaveURL(/\/career\/guides\/supplier-decision-handbook$/);
  await expect(page.getByRole("heading",{level:1,name:/供应商选择/})).toBeVisible();
  await expect(page.getByRole("heading",{level:2})).toHaveCount(5);
  await expect(page.locator("main")).toContainText("参考答案：");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  const downloadEvent=page.waitForEvent("download");
  await page.getByRole("link",{name:/下载完整原创教程/}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  expect(await download.failure()).toBe(null);

  const training=page.getByRole("link",{name:"进入对应在线考试服务"});
  await training.click();
  await expect(page).toHaveURL(/\/career\/practice\/supplier-selection-001$/);
  await expect(page.getByRole("button",{name:"提交答卷并查看报告"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
