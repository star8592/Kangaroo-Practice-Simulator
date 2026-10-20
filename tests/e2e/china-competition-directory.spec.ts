import { test, expect } from "@playwright/test";

test("international events hub excludes all archived domestic competitions", async ({ page }) => {
  await page.goto("/events?event=huabei");
  const hub = page.getByRole("region", { name: "全球数学赛事管家" });
  await expect(hub).toBeVisible();
  const cards = hub.locator('[aria-label="世界赛事目录"] article');
  await expect(cards).toHaveCount(5);
  await expect(cards.filter({hasText:"英国 UKMT"})).toHaveCount(1);
  await expect(cards.filter({hasText:"美国 AMC / AIME"})).toHaveCount(1);
  await expect(cards.filter({hasText:"华罗庚金杯"})).toHaveCount(0);
  await expect(cards.filter({hasText:"希望杯"})).toHaveCount(0);
  await expect(hub.getByRole("button",{name:"中国",exact:true})).toHaveCount(0);

  await hub.getByRole("button",{name:"美国",exact:true}).click();
  await expect(cards).toHaveCount(1);
  await hub.getByRole("button",{name:"全部地区"}).click();
  await expect(cards).toHaveCount(5);
  await hub.getByLabel("搜索赛事").fill("华杯赛");
  await expect(hub.getByRole("status")).toContainText("找到 0 项赛事");
  await hub.getByLabel("搜索赛事").fill("");
  await cards.filter({hasText:"英国 UKMT"}).getByRole("button",{name:"查看赛事管家"}).click();
  await expect(hub.getByText("英国 UKMT · 参赛准备")).toBeVisible();
});

test("retired domestic catalogue API returns no records", async ({ request }) => {
  const r = await request.get("/api/miniapp/china-competitions");
  expect(r.status()).toBe(410);
  const json = await r.json();
  expect(json.entries).toBeUndefined();

  const all = await request.get("/api/miniapp/world-competitions");
  expect(all.status()).toBe(200);
  const data = await all.json();
  expect(data.entries).toHaveLength(5);
  expect(data.entries.every((row:{event:{region:string}})=>row.event.region!=="CN")).toBe(true);
  for (const row of data.entries) {
    expect(row.progress).toBeNull();
    expect(row.following).toBeNull();
  }
});

test("public website showcase contains only international events", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".home-competition-card");
  await expect(cards).toHaveCount(5);
  await expect(cards.filter({hasText:"华罗庚金杯"})).toHaveCount(0);
  await expect(cards.filter({hasText:"希望杯"})).toHaveCount(0);
  await cards.filter({hasText:"英国 UKMT"}).click();
  await expect(page).toHaveURL(/\/events\?event=ukmt$/);
});

test("admin source-watch remains protected", async({request,page})=>{
  expect((await request.get("/api/admin/competition-source-watch")).status()).toBe(403);
  const patch=await request.patch("/api/admin/competition-source-watch",{
    headers:{origin:"http://localhost:3000"},
    data:{id:"not-existing",decision:"reviewed",note:"test action"},
  });
  expect(patch.status()).toBe(403);
  await page.goto("/admin/competition-source-watch");
  await expect(page).toHaveURL(/\/login\?next=/);
});
