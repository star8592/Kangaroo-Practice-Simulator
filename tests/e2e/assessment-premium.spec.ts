import {test,expect} from "@playwright/test";

test("SQL is a separate skills business with only a compatibility redirect",async({page})=>{
 await page.goto("/assessment-center");
 await expect(page.locator('a[href="/assessment-center/sql-lab"]')).toHaveCount(0);
 await expect(page.getByText("岗位胜任与技能")).toHaveCount(0);
 await page.goto("/skill-labs");
 await expect(page.getByRole("heading",{name:"学习一项技能，用真实任务来检验。"})).toBeVisible();
 await page.locator('a[href="/skill-labs/sql-lab"]').click();
 await expect(page.getByRole("heading",{name:"真实 SQL · 数据分析岗位练习"})).toBeVisible();
 const legacy=await page.goto("/assessment-center/sql-lab");
 expect(legacy?.status()).toBe(200);
 expect(new URL(page.url()).pathname).toBe("/skill-labs/sql-lab");
});
test("professional report sample shows deliverables and honest scientific bounds",async({page})=>{
 await page.goto("/assessment-center");
 await page.getByRole("link",{name:/查看报告样例/}).click();
 await expect(page.getByRole("heading",{name:"购买前，先看清楚报告是什么。"})).toBeVisible();
 await expect(page.getByText("示例数据",{exact:true})).toBeVisible();
 await expect(page.getByText(/实际购买后，每项证据都来自本人/)).toBeVisible();
 await expect(page.getByText(/当前.*常模|中文常模：未验证/).first()).toBeVisible();
});
for(const config of [
 {id:"career-interest-exploration-30",count:30,heading:"职业兴趣探索 · 30题"},
 {id:"ipip-big-five-50-cn-preview",count:50,heading:"大五人格探索 · 50题"},
]){
 test(config.id+" offers free brief, explicit paid detail and no fake unlocked report",async({page})=>{
  await page.goto("/assessment-center/"+config.id);
  await expect(page.getByRole("heading",{name:config.heading})).toBeVisible();
  await expect(page.getByText(/简要结果/).first()).toBeVisible();
  await page.getByRole("checkbox",{name:/我已年满18岁/}).check();
  await page.getByRole("button",{name:"同意并开始"}).click();
  for(let n=0;n<config.count;n++){
   await page.locator('input[type="radio"][value="4"]').check();
   await page.getByRole("button",{name:n===config.count-1?"查看我的结果":"下一题"}).click();
  }
  await expect(page.getByRole("heading",{name:"你的免费简要结果"})).toBeVisible();
  await expect(page.getByText(/解读不止一个分数/)).toBeVisible();
  await expect(page.getByRole("link",{name:/购买前，先查看完整版式/})).toBeVisible();
  await expect(page.getByText(/非标准化自我探索服务/).first()).toBeVisible();
  await expect(page.getByLabel("已解锁的完整个人探索报告")).toHaveCount(0);
  const offerResponse=await page.request.get("/api/assessment-reports/offer?instrumentId="+config.id);
  expect(offerResponse.status()).toBe(200);
  const offer=await offerResponse.json();
  if(offer.available===false) {
   await expect(page.getByText(/完整报告付费功能准备中/)).toBeVisible();
   await expect(page.getByRole("button",{name:"确认后微信扫码购买"})).toHaveCount(0);
  }else if(offer.loggedIn===false){
   await expect(page.getByRole("link",{name:/微信登录后重新测评/})).toBeVisible();
  }
 });
}
test("unpaid report API never exposes full report or fake success",async({request})=>{
 const malformed=await request.post("/api/assessment-reports/full",{data:{
  instrumentId:"ipip-big-five-50-cn-preview",answers:{"ipip-50-1":4}
 },headers:{origin:"https://socthink.cn"}});
 expect([401,403,503]).toContain(malformed.status());
 const unknown=await request.get("/api/assessment-reports/offer?instrumentId=unknown-instrument");
 expect(unknown.status()).toBe(404);
});
