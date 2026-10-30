import { test, expect } from "@playwright/test";

test("top navigation separates events companion from mock exams", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Desktop-only nav; mobile menu has a separate test");
  await page.goto("/");
  const header = page.getByRole("navigation", { name: "主要导航" });
  await expect(header.getByRole("link", { name: "竞赛模拟" })).toHaveAttribute("href", "/competitions");
  await expect(header.getByRole("link", { name: "赛事管家" })).toHaveAttribute("href", "/events");
  await expect(page.locator("main")).not.toContainText("华杯赛");
  await expect(page.locator("main")).not.toContainText("希望杯");
  await header.getByRole("link",{name:"赛事管家"}).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("region",{name:"全球数学赛事管家"})).toBeVisible();
});

test("China information-only event never offers an in-site mock", async ({ page }) => {
  await page.goto("/events?event=huabei");
  const hub = page.getByRole("region", { name: "全球数学赛事管家" });
  await expect(hub.locator("#world-competition-detail")).toContainText("华杯赛");
  await expect(hub.getByRole("button", { name: "进入本站模拟训练 ↓" })).toHaveCount(0);
  await hub.getByLabel("搜索赛事").fill("华杯赛");
  await expect(hub.getByRole("status")).toContainText("找到 1 项赛事");
  await hub.getByLabel("搜索赛事").fill("不存在的赛事");
  await expect(hub.getByRole("status")).toContainText("找到 0 项赛事");
  await expect(hub.locator("#world-competition-detail")).toHaveCount(0);
});

test("mock exam page contains training but no duplicated events manager", async ({ page }) => {
  await page.goto("/competitions?c=maa-amc");
  await expect(page.getByRole("heading", { name: /竞赛模拟/ }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "全球数学赛事管家" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("华杯赛");
  await expect(page.locator("main")).not.toContainText("希望杯");
  await expect(page.getByRole("link", { name: "进入赛事管家 →" })).toBeVisible();
  await expect(page.getByRole("button", { name: "AMC 12", exact: true })).toBeVisible();
});

test("old bookmarks still open the exact event", async ({ page }) => {
  await page.goto("/competitions?event=ukmt");
  await expect(page).toHaveURL(/\/events\?event=ukmt$/);
  await expect(page.locator("#world-competition-detail")).toContainText("英国 UKMT");
});

test("mobile header can open the events manager", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only navigation");
  await page.goto("/");
  await page.getByRole("button", { name: "打开导航菜单" }).click();
  await page.getByRole("navigation", { name: "移动端导航" }).getByRole("link", { name: "赛事管家" }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("region", { name: "全球数学赛事管家" })).toBeVisible();
});
