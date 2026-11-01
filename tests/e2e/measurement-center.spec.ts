import {test,expect} from "@playwright/test";

test("scientific measurement center shows six categories and two honest research previews",async({page})=>{
  const response=await page.goto("/assessment-center");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:"科学测评"})).toBeVisible();
  await expect(page.locator("article")).toHaveCount(5);
  await expect(page.getByText("免费研究预览")).toHaveCount(2);
  await expect(page.getByText("建设中",{exact:true})).toHaveCount(1);
  await expect(page.getByText("免费任务练习",{exact:true})).toHaveCount(2);
  await expect(page.locator('a[href="/assessment-center/career-interest-exploration-30"]')).toBeVisible();
  await expect(page.locator('a[href="/assessment-center/ipip-big-five-50-cn-preview"]')).toBeVisible();
});

for(const spec of [
  {id:"career-interest-exploration-30",count:30,heading:"职业兴趣探索 · 30题",name:"职业兴趣"},
  {id:"ipip-big-five-50-cn-preview",count:50,heading:"大五人格探索 · 50题",name:"大五人格"},
]){
  test(spec.name+" completes consent -> all responses -> report -> reset",async({page})=>{
    await page.goto("/assessment-center/"+spec.id);
    await expect(page.getByRole("heading",{name:spec.heading})).toBeVisible();
    const start=page.getByRole("button",{name:"开始测评"});
    await expect(start).toBeDisabled();
    await expect(page.getByText(/作答阶段只在当前页面内计算/)).toBeVisible();
    await page.getByRole("checkbox",{name:/我已年满18岁/}).check();
    await start.click();
    await expect(page.getByRole("button",{name:"下一题"})).toBeDisabled();
    for(let i=0;i<spec.count;i++){
      await expect(page.getByText("第 "+(i+1)+" 题 / 共 "+spec.count+" 题")).toBeVisible();
      await page.locator('input[type="radio"][value="4"]').check();
      await page.getByRole("button",{name:i===spec.count-1?"提交并查看结果":"下一题"}).click();
    }
    await expect(page.getByRole("heading",{name:"你的免费简要结果"})).toBeVisible();
    await expect(page.getByText(/中国同龄人的水平/)).toBeVisible();
    await expect(page.getByText(/评分版本/)).toBeVisible();
    await page.getByRole("button",{name:"重新试测"}).click();
    await expect(start).toBeDisabled();
    await expect(page.getByRole("heading",{name:"测评说明"})).toBeVisible();
  });
}

test("unknown measurement instrument rejects nonexistent links",async({page})=>{
  const response=await page.goto("/assessment-center/nonexistent-2026");
  expect(response?.status()).toBe(404);
});
