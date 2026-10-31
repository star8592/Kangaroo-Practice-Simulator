import { expect, test } from "@playwright/test";

test.describe("SOC THINK unified public navigation", () => {
  test("three homepage actions lead to distinct functional destinations", async ({ page }) => {
    await page.goto("/");
    const content=page.locator("main");
    await expect(content.locator('a[href="/arithmetic"]').filter({hasText:"开始计算训练"}).first()).toBeVisible();
    await expect(content.locator('a[href="/competitions"]').filter({hasText:"参加竞赛模拟"}).first()).toBeVisible();
    const mobile=(page.viewportSize()?.width??1280)<=760;
    if(mobile)await page.getByRole("button",{name:"打开导航菜单"}).click();
    await page.getByRole("navigation",{name:mobile?"移动端导航":"主要导航"})
      .getByRole("link",{name:"考试管理"}).click();
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
