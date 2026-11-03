import { test, expect } from "@playwright/test";

test("math planner and events remain in the separate classroom directory",async({page})=>{
 await page.goto("/");
 const nav=page.getByRole("navigation",{name:"主要导航"});
 await expect(nav.locator('a[href="/assessments"]')).toHaveCount(0);
 await expect(nav.locator('a[href="/events"]')).toHaveCount(0);
 await page.goto("/math");
 await expect(page.getByRole("heading",{level:1,name:"数学课堂"})).toBeVisible();
 await page.locator('main a[href="/exam-planner"]').click();
 await expect(page).toHaveURL(/\/exam-planner$/);
 await page.getByRole("link",{name:/打开数学赛事管家/}).click();
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

test("math classroom opens the events manager on mobile",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/math");
 await expect(page.locator('main a[href="/exam-planner"]')).toBeVisible();
 await page.locator('main a[href="/exam-planner"]').click();
 await expect(page).toHaveURL(/\/exam-planner$/);
 await page.getByRole("link",{name:/打开数学赛事管家/}).click();
 await expect(page).toHaveURL(/\/events$/);
 await expect(page.getByRole("region",{name:"全球数学赛事管家"})).toBeVisible();
});
