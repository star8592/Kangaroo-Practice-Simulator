import {test,expect} from "@playwright/test";

test("one assessment portal links to real products and never sells unlaunched tests",async({page})=>{
  const response = await page.request.get("/api/assessments/catalog");
  expect(response.status()).toBe(200);
  const catalog = await response.json() as {liveDomains:number;domains:{readiness:string;liveRoutes:{href:string}[]}[]};
  expect(catalog.liveDomains).toBe(2);
  expect(catalog.domains).toHaveLength(7);
  expect(catalog.domains.filter(x=>x.readiness==="planned").every(x=>x.liveRoutes.length===0)).toBe(true);
  await page.goto("/assessments");
  await expect(page.getByRole("heading",{name:/不只是练题/})).toBeVisible();
  const available=page.locator('section[aria-labelledby="available-assessments"] article');
  const planned=page.locator('section[aria-labelledby="future-assessments"] article');
  await expect(available).toHaveCount(2);
  await expect(planned).toHaveCount(5);
  await expect(planned.locator("a")).toHaveCount(0);
  await expect(available.getByRole("link",{name:/开始数学能力训练/})).toBeVisible();
  await expect(available.getByRole("link",{name:/进入国际数学竞赛/})).toBeVisible();
  await available.getByRole("link",{name:/开始数学能力训练/}).click();
  await expect(page).toHaveURL(/\/arithmetic/);
  await page.goto("/");
  const mobile = (page.viewportSize()?.width ?? 1280) <= 760;
  if (mobile) await page.getByRole("button",{name:"打开导航菜单"}).click();
  const navigable = page.locator('a[href="/assessments"]:visible').first();
  await expect(navigable).toBeVisible();
  await navigable.click();
  await expect(page).toHaveURL(/\/assessments/);
});
