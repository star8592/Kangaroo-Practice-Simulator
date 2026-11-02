import {test,expect} from "@playwright/test";
const configs=[
 {id:"work-values-30",count:30,heading:"职业价值观探索 · 30题",report:"你的工作探索结果"},
 {id:"work-style-24",count:24,heading:"工作方式探索 · 24题",report:"你的工作探索结果"},
 {id:"workplace-sjt-24",count:24,heading:"职场情境判断 · 24题",report:"职场情境训练复盘"},
] as const;
test("the free assessment directory exposes three real new assessments and nine evidence records",async({page})=>{
 await page.goto("/assessment-center");
 for(const config of configs)await expect(page.locator('a[href="/assessment-center/'+config.id+'"]')).toBeVisible();
 await expect(page.locator("article")).toHaveCount(9);
 await page.getByRole("link",{name:"查看全部技术档案"}).click();
 await page.getByRole("link",{name:/查看全部测评技术档案/}).click();
 await expect(page.locator("article")).toHaveCount(9);
 for(const config of configs)await expect(page.getByRole("heading",{name:config.heading})).toBeVisible();
});
for(const config of configs){
 test(config.id+" original questions, consent, skip, review, scoring and print",async({page})=>{
  const response=await page.goto("/assessment-center/"+config.id);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:config.heading})).toBeVisible();
  const start=page.getByRole("button",{name:"确认入场 · 开始作答"});
  await expect(start).toBeDisabled();
  await page.getByRole("checkbox",{name:/我已年满18岁/}).check();
  await start.click();
  await page.getByRole("button",{name:"答题总览"}).click();
  await expect(page.getByRole("heading",{name:"交卷检查"})).toBeVisible();
  await expect(page.getByRole("button",{name:"确认交卷 · 查看报告"})).toBeDisabled();
  await page.getByRole("button",{name:"返回第1题，未答"}).click();
  for(let i=0;i<config.count;i++){
   await expect(page.getByText("第 "+(i+1)+" / "+config.count+" 题")).toBeVisible();
   await page.locator('input[type="radio"]').first().check();
   await page.getByRole("button",{name:i===config.count-1?"检查答卷":"下一题"}).click();
  }
  await expect(page.getByRole("heading",{name:"交卷检查"})).toBeVisible();
  await expect(page.getByRole("button",{name:"确认交卷 · 查看报告"})).toBeEnabled();
  await page.getByRole("button",{name:"确认交卷 · 查看报告"}).click();
  await expect(page.getByRole("heading",{name:config.report})).toBeVisible();
  await expect(page.getByRole("button",{name:"打印结果"})).toBeVisible();
  if(config.id==="workplace-sjt-24"){
   await expect(page.getByRole("heading",{name:"逐题参考策略与说明"})).toBeVisible();
   await expect(page.locator("ol").last().locator("li")).toHaveCount(24);
   await expect(page.getByText(/未经过独立职业专家组盲审/)).toBeVisible();
  }else{
   await expect(page.getByText(/题项均值/).first()).toBeVisible();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"重新测评"}).click();
  await expect(start).toBeDisabled();
 });
}
