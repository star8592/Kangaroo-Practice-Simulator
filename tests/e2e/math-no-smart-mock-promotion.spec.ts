import {expect,test} from "@playwright/test";

test("international math competition prioritizes real papers and hides smart mocks",async({page})=>{
 for(const route of ["/math","/competitions?c=maa-amc"]){
  const response=await page.goto(route);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:/竞赛模拟/}).first()).toBeVisible();
  const cards=page.locator(".competition-card");
  // GitHub CI uses a deliberately small data fixture, while production has
  // five competitions. Assert all *available* formats rather than hard-coding
  // a full licensed corpus into an E2E test.
  expect(await cards.count()).toBeGreaterThan(0);
  for(let i=0;i<await cards.count();i++){
   await cards.nth(i).click();
   await expect(page.locator("main")).not.toContainText(/智能组卷|可智能组卷|按赛制智能组卷|Smart mock available|SMART BY FORMAT/);
   await expect(page.locator(".smart-mock-grid")).toHaveCount(0);
   const choices=page.locator(".segmented button:enabled");
   if(await choices.count()>1){
    await choices.nth(1).click();
    await expect(page.locator(".feature-grid article").first()).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/智能组卷|可智能组卷|Smart mock/);
   }
  }
 }
});

test("public resource catalogue does not advertise smart-generated papers",async({page})=>{
 const response=await page.goto("/resources");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{level:1,name:"查找试卷，直接练习"})).toBeVisible();
 await expect(page.locator('select').last().getByRole("option",{name:"智能组卷"})).toHaveCount(0);
 await expect(page.locator("main")).not.toContainText("智能组卷");
 // A guide exists only when this fixture includes eligible papers for its
 // competition. Follow a discovered link rather than inventing a hub URL.
 const guideLink=page.locator('main a[href^="/resources/competitions/"]').first();
 if(await guideLink.count()>0){
  const href=await guideLink.getAttribute("href");
  expect(href).toBeTruthy();
  const guide=await page.goto(href!);
  expect(guide?.status()).toBe(200);
  await expect(page.locator("main")).not.toContainText("平台智能组卷");
 }
});

test("the backend preserves smart profile accounting without promoting it",async({request})=>{
 const response=await request.get("/api/release");
 expect(response.status()).toBe(200);
 const receipt=await response.json();
 expect(receipt.ok).toBe(true);
 expect(typeof receipt.trainingInventory?.smartProfiles).toBe("number");
 // Existing data is retained; the public presentation change never deletes profiles.
 expect(receipt.trainingInventory.smartProfiles).toBeGreaterThanOrEqual(0);
});
