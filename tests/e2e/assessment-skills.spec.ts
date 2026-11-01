import {test,expect} from "@playwright/test";

test("center exposes two real skills tasks while preserving honest labels",async({page})=>{
 const response=await page.goto("/assessment-center");
 expect(response?.status()).toBe(200);
 await expect(page.locator("article")).toHaveCount(5);
 await expect(page.getByText("免费研究预览",{exact:true})).toHaveCount(2);
 await expect(page.getByText("免费任务练习",{exact:true})).toHaveCount(2);
 await expect(page.getByText("建设中",{exact:true})).toHaveCount(1);
 await expect(page.locator('a[href="/assessment-center/reasoning-practice-20"]')).toBeVisible();
 await expect(page.locator('a[href="/assessment-center/sql-lab"]')).toHaveCount(0);
});

test("reasoning 20-task practice is fully playable, scored and explained",async({page})=>{
 await page.goto("/assessment-center/reasoning-practice-20");
 await expect(page.getByRole("heading",{name:"认知推理任务练习 · 20题"})).toBeVisible();
 await expect(page.getByText(/不能估算智商/)).toBeVisible();
 const start=page.getByRole("button",{name:"开始20题练习"});
 await expect(start).toBeDisabled();
 await page.getByRole("checkbox",{name:/我已年满18岁/}).check();
 await start.click();
 await expect(page.getByRole("button",{name:"下一题"})).toBeDisabled();
 for(let i=1;i<=20;i++){
  await expect(page.getByText(new RegExp("第 "+i+" / 20 题"))).toBeVisible();
  await page.locator('input[type="radio"][value="1"]').check();
  await page.getByRole("button",{name:i===20?"交卷并查看解析":"下一题"}).click();
 }
 await expect(page.getByRole("heading",{name:"任务练习报告"})).toBeVisible();
 await expect(page.getByText(/不是标准化认知能力/)).toBeVisible();
 await expect(page.locator("li").filter({hasText:"第 1 题"}).first()).toBeVisible();
 await page.getByRole("button",{name:"重新练习"}).click();
 await expect(start).toBeDisabled();
});

test("real isolated SQLite rejects DML and grades four queries across two datasets",async({page})=>{
 await page.goto("/skill-labs/sql-lab");
 await expect(page.getByRole("heading",{name:"真实 SQL · 数据分析岗位练习"})).toBeVisible();
 const start=page.getByRole("button",{name:"打开 SQL 实训台"});
 await expect(start).toBeDisabled();
 await page.getByRole("checkbox",{name:/我已年满18岁/}).check();
 await start.click();
 const editor=page.getByRole("textbox",{name:"你的 SQLite 查询"});
 const run=page.getByRole("button",{name:"运行 SQL 并核对结果"});
 await editor.fill("DELETE FROM orders");
 await run.click();
 await expect(page.getByText(/ONLY_ONE_READ_ONLY_SELECT/)).toBeVisible();
 const queries=[
   "SELECT order_id, amount FROM orders WHERE status='paid' AND amount>=100 ORDER BY amount DESC, order_id ASC",
   "SELECT channel, COUNT(*) AS paid_count FROM orders WHERE status='paid' GROUP BY channel ORDER BY channel ASC",
   "SELECT c.name, SUM(o.amount) AS total_paid FROM customers c JOIN orders o ON c.customer_id=o.customer_id WHERE o.status='paid' GROUP BY c.customer_id,c.name ORDER BY total_paid DESC,c.name ASC",
   "SELECT customer_id, COUNT(*) AS paid_count, SUM(amount) AS total_paid FROM orders WHERE status='paid' GROUP BY customer_id HAVING COUNT(*)>=2 AND SUM(amount)>=150 ORDER BY total_paid DESC"
 ];
 for(let i=0;i<queries.length;i++){
  await editor.fill(queries[i]);
  await run.click();
  await expect(page.getByText(/两组数据通过/)).toBeVisible({timeout:15000});
  await expect(page.getByText(/已检查 2 组数据/)).toBeVisible();
  await expect(page.getByRole("heading",{name:"真实 SQLite 查询结果 · 第一组数据"})).toBeVisible();
  await page.getByRole("button",{name:i===3?"查看技能练习报告":"进入下一任务"}).click();
 }
 await expect(page.getByRole("heading",{name:"岗位任务完成记录"})).toBeVisible();
 await expect(page.getByText(/已完成并通过 4 \/ 4 项 SQL 任务/)).toBeVisible();
 await page.getByRole("button",{name:"重新练习"}).click();
 await expect(start).toBeDisabled();
});
