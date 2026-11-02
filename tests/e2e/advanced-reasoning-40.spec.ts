import {test,expect} from "@playwright/test";
const ROUTE="/assessment-center/advanced-reasoning-40";
test("advanced reasoning is discoverable, officially distinct, and evidence registered",async({page})=>{
 const response=await page.goto("/assessment-center");
 expect(response?.status()).toBe(200);
 const link=page.locator('a[href="'+ROUTE+'"]');
 await expect(link.first()).toBeVisible();
 await expect(page.getByRole("heading",{name:"这项测评由谁开发？依据是什么？"})).toBeVisible();
 await expect(page.getByRole("link",{name:/了解测评中心与开发原则/})).toBeVisible();
 await link.first().click();
 await expect(page).toHaveURL(new RegExp(ROUTE+"$"));
 await expect(page.getByRole("heading",{name:"高级逻辑与批判性推理 · 40题"})).toBeVisible();
 await expect(page.getByText("非官方、非标准化测验")).toBeVisible();
 await expect(page.getByText(/SOCTHINK原创40道文字、条件、数列与证据题/)).toBeVisible();
 await page.goto("/assessment-center/methodology");
 await expect(page.locator("article")).toHaveCount(9);
 await expect(page.getByRole("heading",{name:"高级逻辑与批判性推理 · 40题"})).toBeVisible();
});
test("complete original 40-item advanced reasoning timed exam, resume, scoring and reset",async({page})=>{
 const response=await page.goto(ROUTE);
 expect(response?.status()).toBe(200);
 const start=page.getByRole("button",{name:"确认入场 · 开始模拟"});
 await expect(start).toBeDisabled();
 await page.getByRole("checkbox",{name:/我已年满18岁/}).check();
 await start.click();
 await expect(page.getByRole("timer",{name:"剩余时间"})).toHaveText(/44:|45:/);
 await page.getByRole("button",{name:"☆ 标记复查"}).click();
 await expect(page.getByRole("button",{name:"★ 已标记"})).toBeVisible();
 await page.locator('input[type="radio"]').first().check();
 await page.reload({waitUntil:"domcontentloaded"});
 await expect(page.getByText("已答 1/40",{exact:true})).toBeVisible();
 await expect(page.locator('input[type="radio"]').first()).toBeChecked();
 await expect(page.getByRole("button",{name:"★ 已标记"})).toBeVisible();
 for(let i=0;i<40;i++){
  await expect(page.getByText("第 "+(i+1)+" / 40 题",{exact:false})).toBeVisible();
  await page.locator('input[type="radio"]').first().check();
  if(i<39)await page.getByRole("button",{name:"下一题"}).click();
 }
 await page.getByRole("button",{name:"检查交卷"}).click();
 await expect(page.getByRole("heading",{name:"交卷前检查"})).toBeVisible();
 await expect(page.getByText("已答 40 题")).toBeVisible();
 await page.getByRole("button",{name:"确认交卷 · 查看成绩"}).click();
 await expect(page.getByRole("heading",{name:"本次模拟成绩"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"01 · 答卷概况"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"03 · 证据复盘与下一步训练"})).toBeVisible();
 await expect(page.getByText("选取的错题证据")).toBeVisible();
 await expect(page.getByText("答对",{exact:false}).first()).toBeVisible();
 await page.getByText("查看40题逐题解析与原始作答").click();
 await expect(page.locator("ol").last().locator("li")).toHaveCount(40);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole("button",{name:"重新模拟"}).click();
 await expect(start).toBeDisabled();
});
test("blank answer sheet can be deliberately submitted and must score zero",async({page})=>{
 await page.goto(ROUTE);
 await page.getByRole("checkbox",{name:/我已年满18岁/}).check();
 await page.getByRole("button",{name:"确认入场 · 开始模拟"}).click();
 await page.getByRole("button",{name:"答题总览 / 提前交卷"}).click();
 await expect(page.getByText("未答 40 题")).toBeVisible();
 await page.getByRole("button",{name:"确认交卷 · 查看成绩"}).click();
 await expect(page.getByText("答对",{exact:false}).first()).toBeVisible();
 await expect(page.getByText("0 / 40",{exact:false}).first()).toBeVisible();
 await expect(page.getByText(/本次交白卷，只有空白记录/)).toBeVisible();
 await expect(page.getByText(/没有已作答题，无法识别具体错误模式/)).toBeVisible();
 await expect(page.locator("ul[class*=reportEvidenceList]")).toHaveCount(0);
 await page.getByText("查看40题逐题解析与原始作答").click();
 await expect(page.locator("ol").last().locator("li")).toHaveCount(40);
});

test("the publisher disclosure page explains origin without fabricated endorsement",async({page})=>{
 const response=await page.goto("/assessment-center/about");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{name:"让每一次测评，都有依据可查。"})).toBeVisible();
 await expect(page.getByText("青梧未来（武汉）人工智能应用软件有限公司")).toBeVisible();
 await expect(page.getByText("鄂ICP备2026004372号")).toBeVisible();
 await expect(page.getByRole("link",{name:/工信部 ICP 备案查询入口/})).toBeVisible();
 await expect(page.getByRole("link",{name:/查看全部测评技术档案/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
