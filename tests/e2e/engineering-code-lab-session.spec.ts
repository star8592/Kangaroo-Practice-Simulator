import {test,expect} from "@playwright/test";
import {CODE_LAB_SESSION_KEY} from "../../src/lib/code-lab-session";
import {CODE_CHALLENGES,CODE_LAB_VERSION} from "../../src/lib/code-lab";
import {CODE_LAB_REFERENCE} from "../../scripts/code_lab_reference";
const URL="/skill-labs/code-lab";
async function admit(page:import("@playwright/test").Page){
 await page.goto(URL);
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
}
test("typed draft and current task persist after refresh without creating any account record",async({page})=>{
 await admit(page);
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 const own="function normalizePaidOrderIds(orders) {\n  return orders.map(x => x.id);\n}";
 await editor.fill(own);
 await expect.poll(()=>page.evaluate(key=>sessionStorage.getItem(key),CODE_LAB_SESSION_KEY)).toContain("return orders.map");
 await page.reload();
 await expect(page.getByRole("button",{name:"运行代码并核验"})).toBeVisible();
 await expect(editor).toHaveValue(own);
 await expect(page.getByText("任务 1 / 6")).toBeVisible();
 await expect(page.getByText(/本标签页暂存/)).toBeVisible();
});
test("switching tasks preserves distinct drafts and solved task state",async({page})=>{
 await admit(page);
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await editor.fill(CODE_LAB_REFERENCE[CODE_CHALLENGES[0].id]);
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByText("任务通过 · 4组真实执行全部正确")).toBeVisible({timeout:16000});
 await page.getByRole("button",{name:"进入下一任务"}).click();
 await expect(page.getByText("任务 2 / 6")).toBeVisible();
 const second="function aggregatePayments(orders) {\n  return {paidCount: 42,paidTotal:0,refundedTotal:0};\n}";
 await editor.fill(second);
 await page.getByRole("button",{name:"上一任务"}).click();
 await expect(editor).toHaveValue(CODE_LAB_REFERENCE[CODE_CHALLENGES[0].id]);
 await expect(page.getByText("已通过 1/6")).toBeVisible();
 await page.getByRole("button",{name:"进入下一任务"}).click();
 await expect(editor).toHaveValue(second);
 await expect.poll(()=>page.evaluate(({key,id})=>JSON.parse(sessionStorage.getItem(key)||"{}").drafts?.[id],{key:CODE_LAB_SESSION_KEY,id:CODE_CHALLENGES[1].id})).toBe(second);
 await page.reload();
 await expect(editor).toHaveValue(second);
 await expect(page.getByText("任务 2 / 6")).toBeVisible();
 await expect(page.getByText("已通过 1/6")).toBeVisible();
});
test("Tab indentation, Shift+Tab dedentation and Ctrl+Enter actually execute code",async({page})=>{
 await admit(page);
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await editor.fill("abc");
 await editor.evaluate((el:HTMLTextAreaElement)=>{el.focus();el.setSelectionRange(1,1)});
 await editor.press("Tab");
 await expect(editor).toHaveValue("a  bc");
 await editor.fill("  return [];");
 await editor.evaluate((el:HTMLTextAreaElement)=>{el.focus();el.setSelectionRange(4,4)});
 await editor.press("Shift+Tab");
 await expect(editor).toHaveValue("return [];");
 await editor.fill("function normalizePaidOrderIds(orders) { return []; }");
 await editor.press("Control+Enter");
 await expect(page.getByText("需要修正代码")).toBeVisible({timeout:16000});
 await expect(page.getByText("执行结果",{exact:true})).toBeVisible();
});
test("invalid prior session is discarded and new browser tab does not share practice state",async({browser})=>{
 const context=await browser.newContext();
 try{
  const p=await context.newPage();
  await p.goto("/");
  await p.evaluate(({key,version})=>sessionStorage.setItem(key,JSON.stringify({version,stage:"report",index:0,drafts:{},solved:{},attempts:{}})),{key:CODE_LAB_SESSION_KEY,version:CODE_LAB_VERSION});
  await p.goto(URL);
  await expect(p.getByRole("button",{name:"开始编程实操"})).toBeVisible();
  await p.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
  await p.getByRole("button",{name:"开始编程实操"}).click();
  await p.getByRole("textbox",{name:"你的JavaScript代码"}).fill("unique per-tab code");
  await expect.poll(()=>p.evaluate(key=>sessionStorage.getItem(key),CODE_LAB_SESSION_KEY)).toContain("unique per-tab code");
  const second=await context.newPage();
  await second.goto(URL);
  await expect(second.getByRole("button",{name:"开始编程实操"})).toBeVisible();
  await second.close();
 }finally{await context.close();}
});

test("explicit reset asks for confirmation and clears drafts, results and saved session",async({page})=>{
 await admit(page);
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 const own="function normalizePaidOrderIds(orders) { return [999]; }";
 await editor.fill(own);
 await expect.poll(()=>page.evaluate(key=>sessionStorage.getItem(key),CODE_LAB_SESSION_KEY)).toContain("999");
 await page.getByRole("button",{name:"重置练习"}).click();
 await expect(page.getByRole("group",{name:"确认清空本次练习"})).toBeVisible();
 await page.getByRole("button",{name:"取消"}).click();
 await expect(editor).toHaveValue(own);
 await page.getByRole("button",{name:"重置练习"}).click();
 await page.getByRole("button",{name:"确认清空"}).click();
 await expect(page.getByRole("button",{name:"开始编程实操"})).toBeVisible();
 expect(await page.evaluate(key=>sessionStorage.getItem(key),CODE_LAB_SESSION_KEY)).toBeNull();
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 await expect(editor).toHaveValue(CODE_CHALLENGES[0].starter);
});
