import { expect, test } from "@playwright/test";

test.describe("SOC THINK unified public navigation", () => {
  test("three homepage actions lead to distinct functional destinations", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator(".home-hero");
    await expect(hero.getByRole("link", { name: "开始计算训练" })).toHaveAttribute("href", "/arithmetic");
    await expect(hero.getByRole("link", { name: "参加竞赛模拟" })).toHaveAttribute("href", "/competitions");
    await hero.getByRole("link", { name: "探索全球赛事" }).click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole("heading", { name: "全球数学赛事管家" })).toBeVisible();
  });

  test("public event directory has China and international events with verifiable sources", async ({ page }) => {
    await page.goto("/events");
    const cards = page.locator('section[aria-label="赛事列表"] article');
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    expect(total).toBeGreaterThan(1);
    await page.getByRole("combobox", { name: "地区" }).selectOption("CN");
    await expect(cards.first()).toBeVisible();
    const chinaCount = await cards.count();
    expect(chinaCount).toBeGreaterThan(0);
    expect(chinaCount).toBeLessThan(total);
    await page.getByRole("combobox", { name: "地区" }).selectOption("all");
    await page.getByRole("searchbox", { name: "搜索赛事" }).fill("华罗庚");
    await expect(cards).toHaveCount(1);
    await expect(cards.first().getByRole("link", { name: /查看赛事来源/ })).toHaveAttribute("href", /^https:\/\//);
    await page.getByRole("searchbox", { name: "搜索赛事" }).fill("not-an-existing-event");
    await expect(page.getByRole("button", { name: "查看全部赛事" })).toBeVisible();
    await page.getByRole("button", { name: "查看全部赛事" }).click();
    await expect(cards).toHaveCount(total);
  });
});
