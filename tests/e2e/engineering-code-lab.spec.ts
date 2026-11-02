import {test,expect} from "@playwright/test";
import {CODE_CHALLENGES} from "../../src/lib/code-lab";
import {CODE_LAB_REFERENCE} from "../../scripts/code_lab_reference";
const URL="/skill-labs/code-lab";
test("real software work-sample runs six user-written functions in QuickJS and reports actual results",async({page})=>{
 const response=await page.goto(URL);
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{name:"软件工程师 · 真实代码实操"})).toBeVisible();
 const start=page.getByRole("button",{name:"开始编程实操"});
 await expect(start).toBeDisabled();
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await start.click();
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 const run=page.getByRole("button",{name:"运行代码并核验"});
 for(let i=0;i<CODE_CHALLENGES.length;i++){
  await expect(page.getByText("任务 "+(i+1)+" / 6")).toBeVisible();
  await editor.fill(CODE_LAB_REFERENCE[CODE_CHALLENGES[i].id]);
  await run.click();
  await expect(page.getByText(/任务通过 · 4组真实执行全部正确/)).toBeVisible({timeout:16000});
  await expect(page.getByText(/全部真实执行用例通过/)).toBeVisible();
  await page.getByRole("button",{name:i===5?"查看技能练习报告":"进入下一任务"}).click();
 }
 await expect(page.getByRole("heading",{name:"软件工程实训记录"})).toBeVisible();
 await expect(page.getByText(/完成了\s*6\/6\s*项原创工程任务/)).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
 await page.getByRole("button",{name:"重新练习"}).click();
 await expect(start).toBeDisabled();
});

test("code judge rejects wrong output and does not expose network host binding",async({page})=>{
 await page.goto(URL);
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await editor.fill("function normalizePaidOrderIds(x){return []}");
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByText("需要修正代码")).toBeVisible({timeout:16000});
 await expect(page.getByRole("button",{name:"进入下一任务"})).toBeDisabled();
 await editor.fill("function normalizePaidOrderIds(x){return fetch('https://example.com')}");
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByText(/fetch is not defined|fetch.*not defined/)).toBeVisible({timeout:16000});
});

test("only real skill products have direct career and skills catalogue entries",async({page})=>{
 let response=await page.goto("/skill-labs");
 expect(response?.status()).toBe(200);
 await expect(page.locator('a[href="/skill-labs/code-lab"]')).toBeVisible();
 response=await page.goto("/career");
 expect(response?.status()).toBe(200);
 const services=page.locator("#digital-services");
 await expect(services.getByRole("link",{name:"开始编程"})).toHaveAttribute("href",URL);
 await services.getByRole("link",{name:"开始编程"}).click();
 await expect(page).toHaveURL(new RegExp(URL+"$"));
 await expect(page.getByRole("heading",{name:"软件工程师 · 真实代码实操"})).toBeVisible();
});

test("runaway JavaScript is interrupted and a subsequent correct submission still works",async({page})=>{
 await page.goto(URL);
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await editor.fill("function normalizePaidOrderIds(){while(true){} }");
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByText(/执行或语法错误|interrupted|执行超过安全时间限制/)).toBeVisible({timeout:16000});
 await expect(page.getByRole("button",{name:"进入下一任务"})).toBeDisabled();
 await editor.fill(CODE_LAB_REFERENCE["paid-orders"]);
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByText(/任务通过 · 4组真实执行全部正确/)).toBeVisible({timeout:16000});
});
