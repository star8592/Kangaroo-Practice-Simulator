import {expect,test} from "@playwright/test";

const corePages=[
  "/","/assessments","/resources","/membership","/login",
  "/competitions","/events","/terms","/digital-purchase-policy",
] as const;

test("public exam, resource, commerce and login pages share one coherent accessible portal",async({page})=>{
  const health=await page.request.get("/api/release");
  expect(health.ok(),"SOCTHINK must own the E2E server, not another app").toBe(true);
  const identity=await health.json();
  expect(identity.service,"Reject unrelated applications sharing a port").toBe("math-competition-lab");
  expect(identity.ok).toBe(true);
  for(const path of corePages){
    const response=await page.goto(path,{waitUntil:"domcontentloaded"});
    expect(response?.status(),`Expected HTTP 200 for ${path}`).toBe(200);
    await expect(page.locator("h1"),`One primary heading: ${path}`).toHaveCount(1);
    await expect(page.locator("main"),`One main landmark: ${path}`).toHaveCount(1);
    // Desktop and mobile navigation each contain an accessible entry.
    await expect(page.locator('header a[href="/membership"]')).toHaveCount(2);
    await expect(page.locator('footer a[href="/membership"]')).toHaveCount(1);
    const overflow=await page.evaluate(()=>
      document.documentElement.scrollWidth>window.innerWidth+2);
    expect(overflow,`No horizontal page overflow: ${path}`).toBe(false);
  }
});

test("commerce page offers real free entrances without an invented price or checkout",async({page})=>{
  await page.goto("/membership",{waitUntil:"domcontentloaded"});
  for(const href of ["/assessments","/resources","/arithmetic","/account"]){
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  }
  await expect(page.getByText("不支持无理由退款").first()).toBeVisible();
  await expect(page.locator('main a[href="/digital-purchase-policy"]')).toBeVisible();
});

test("old parent routes and account entry lead to one unified WeChat sign-in",async({page})=>{
  await page.goto("/account",{waitUntil:"domcontentloaded"});
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator("h1")).toHaveCount(1);
  for(const route of ["/parent/login","/parent/register"]){
    await page.goto(route,{waitUntil:"domcontentloaded"});
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});
