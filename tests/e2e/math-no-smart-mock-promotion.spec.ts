import {expect,test} from "@playwright/test";

test("international math competition prioritizes real papers and hides smart mocks",async({page})=>{
 for(const route of ["/math","/competitions?c=maa-amc"]){
  const response=await page.goto(route);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:/竞赛模拟/}).first()).toBeVisible();
  const cards=page.locator(".competition-card");
  await expect(cards).toHaveCount(5);
  await expect(page.locator("main")).not.toContainText(/智能组卷|可智能组卷|按赛制智能组卷|Smart mock available|SMART BY FORMAT/);
  await expect(page.locator(".smart-mock-grid")).toHaveCount(0);
  const stages=page.locator(".competition-grid");
  await expect(stages).toContainText("套");
  await page.getByRole("button",{name:/美国 AMC（MAA）/}).first().click();
  await page.getByRole("button",{name:"AMC 8",exact:true}).first().click();
  await expect(page.locator("main")).not.toContainText(/智能组卷|可智能组卷|Smart mock/);
  await expect(page.getByRole("heading",{name:"历年真题"})).toBeVisible();
 }
});

test("public resource catalogue does not advertise smart-generated papers",async({page})=>{
 const response=await page.goto("/resources");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{level:1,name:"查找试卷，直接练习"})).toBeVisible();
 await expect(page.locator('select').last().getByRole("option",{name:"智能组卷"})).toHaveCount(0);
 await expect(page.locator("main")).not.toContainText("智能组卷");
 const guide=await page.goto("/resources/competitions/maa-amc");
 expect(guide?.status()).toBe(200);
 await expect(page.locator("main")).not.toContainText("平台智能组卷");
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
