import {expect,test} from "@playwright/test";

const PATH="/career/practice/supplier-selection-001";

/** Real user path: employer evidence -> available original case -> actual
 * server-side grading -> report -> retest. Shared by desktop and mobile.
 */
test("free procurement career case is usable end to end",async({page})=>{
  const catalog=await page.goto("/career");
  expect(catalog?.status()).toBe(200);
  const live=page.getByRole("link",{name:/供应商寻源与评分模拟.*免费在线作答/});
  await expect(live).toBeVisible();
  await live.click();
  await expect(page).toHaveURL(new RegExp(PATH+"$"));
  await expect(page.getByRole("heading",{name:/采购岗位实操/})).toBeVisible();
  await expect(page.getByText(/独立原创/)).toBeVisible();

  await page.getByRole("checkbox",{name:/甲厂 A/}).check();
  await page.getByRole("checkbox",{name:/丙厂 C/}).check();
  await page.getByRole("button",{name:"下一题"}).click();
  await page.locator('input[inputmode="numeric"]').fill("657");

  // Anonymous drafts are retained only in this browser, not a paid account.
  await page.reload();
  await expect(page.getByRole("checkbox",{name:/甲厂 A/})).toBeChecked();
  await expect(page.getByRole("checkbox",{name:/丙厂 C/})).toBeChecked();
  await page.getByRole("button",{name:"下一题"}).click();
  await expect(page.locator('input[inputmode="numeric"]')).toHaveValue("657");

  await page.getByRole("button",{name:"下一题"}).click();
  await page.locator('input[inputmode="numeric"]').fill("34821");
  await page.getByRole("button",{name:"下一题"}).click();
  await page.getByRole("radio",{name:/丙厂 C/}).check();
  await page.getByRole("button",{name:"下一题"}).click();
  await page.locator('input[inputmode="numeric"]').fill("71");
  await page.getByRole("button",{name:"下一题"}).click();
  await page.getByRole("radio",{name:/没有一家满足/}).check();
  await page.getByRole("button",{name:"提交答卷并查看报告"}).click();

  const report=page.locator('section[aria-label="职业案例成绩报告"]');
  await expect(report).toContainText(/100\s*\/\s*100/);
  await expect(report).toContainText("本次已回答 6/6 题");
  await expect(report).toContainText("供应商准入与交期");
  await expect(report).toContainText("重新挑战本案例");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  await page.getByRole("button",{name:"重新挑战本案例"}).click();
  await page.getByRole("button",{name:"提交答卷并查看报告"}).click();
  await expect(report).toContainText(/0\s*\/\s*100/);
  await expect(report).toContainText("本次已回答 0/6 题");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

const additional=[
  {id:"campaign-performance-001",answers:[
    {kind:"multiple",checks:["站内搜索","社群推荐"]},
    {kind:"integer",value:"33120"},
    {kind:"integer",value:"12100"},
    {kind:"single",choice:"社群推荐"},
    {kind:"integer",value:"21120"},
    {kind:"single",choice:"社群推荐"},
  ]},
  {id:"manufacturing-quality-001",answers:[
    {kind:"integer",value:"240"},
    {kind:"single",choice:"温度传感器漂移"},
    {kind:"multiple",checks:["电源接头松动","温度传感器漂移"]},
    {kind:"integer",value:"120"},
    {kind:"integer",value:"120"},
    {kind:"single",choice:/同时考察严重度/},
  ]},
];
for(const example of additional){
  test("original "+example.id+" shares the working exam and report flow",async({page})=>{
    const response=await page.goto("/career/practice/"+example.id);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading",{level:1})).toBeVisible();
    for(const [i,step] of example.answers.entries()){
      if(step.kind==="multiple"){
        for(const label of step.checks!)
          await page.getByRole("checkbox",{name:label}).check();
      }else if(step.kind==="integer"){
        await page.locator('input[inputmode="numeric"]').fill(step.value!);
      }else{
        await page.getByRole("radio",{name:step.choice}).check();
      }
      if(i<example.answers.length-1)await page.getByRole("button",{name:"下一题"}).click();
    }
    await page.getByRole("button",{name:"提交答卷并查看报告"}).click();
    const report=page.locator('section[aria-label="职业案例成绩报告"]');
    await expect(report).toContainText(/100\\s*\\/\\s*100/);
    await expect(report).toContainText("本次已回答 6/6 题");
    await page.getByRole("button",{name:"重新挑战本案例"}).click();
    await page.getByRole("button",{name:"提交答卷并查看报告"}).click();
    await expect(report).toContainText(/0\\s*\\/\\s*100/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
