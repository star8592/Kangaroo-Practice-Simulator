import { expect, test } from "@playwright/test";

test.describe("SOC THINK unified public navigation", () => {
  test("career home actions are real and mathematics has its own directory", async ({ page }) => {
    await page.goto("/");
    const content=page.locator("main");
    for(const href of ["/career","/learn","/practice"])
      await expect(content.locator('a[href="'+href+'"]').first()).toBeVisible();
    await content.locator('a[href="/learn"]').first().click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole("heading",{level:1,name:/岗位真正需要的技能/})).toBeVisible();
    await page.goto("/practice");
    await expect(page.getByRole("heading",{level:1,name:/模拟检验求职/})).toBeVisible();

    await page.goto("/math");
    await expect(page.getByRole("heading",{level:1,name:"数学课堂"})).toBeVisible();
    await page.locator('main a[href="/exam-planner"]').first().click();
    await expect(page).toHaveURL(/\/exam-planner$/);
    await expect(page.getByRole("heading",{name:"我的考试管理"})).toBeVisible();
    await page.getByRole("link",{name:/打开数学赛事管家/}).click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole("heading",{name:"全球数学赛事管家"})).toBeVisible();
  });

  test("public event directory treats China and international events equally", async ({ page }) => {
    await page.goto("/events");
    const hub = page.getByRole("region", { name: "全球数学赛事管家" });
    const cards = hub.locator('[aria-label="世界赛事目录"] article');
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    expect(total).toBeGreaterThan(1);
    await hub.getByRole("button", { name: "中国", exact: true }).click();
    await expect(cards.first()).toBeVisible();
    const chinaCount = await cards.count();
    expect(chinaCount).toBeGreaterThan(0);
    expect(chinaCount).toBeLessThan(total);
    await hub.getByRole("button", { name: "全部地区", exact: true }).click();
    await hub.getByRole("searchbox", { name: "搜索赛事" }).fill("华罗庚");
    await expect(cards).toHaveCount(1);
    await expect(hub.locator("#world-competition-detail").getByRole("link", { name: /查看赛事来源/ })).toHaveAttribute("href", /^https:\/\//);
    await hub.getByRole("searchbox", { name: "搜索赛事" }).fill("not-an-existing-event");
    await expect(cards).toHaveCount(0);
    await expect(hub.locator("#world-competition-detail")).toHaveCount(0);
    await hub.getByRole("searchbox", { name: "搜索赛事" }).clear();
    await expect(cards).toHaveCount(total);
  });
});
