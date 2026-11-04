import {expect,test} from "@playwright/test";

test("Agent project course launches a real JavaScript coding assignment rather than fake certificate",async({page})=>{
 await page.goto("/skill-labs/agent-foundations");
 const link=page.getByRole("link",{name:/开始真实代码作业/});
 await expect(link).toBeVisible();
 await link.click();
 await expect(page).toHaveURL(/\/skill-labs\/engineering\/agent$/);
 await expect(page.getByRole("heading",{level:1,name:/AI Agent 工程 · 真实代码作业/})).toBeVisible();
 await expect(page.getByText(/JavaScript 版本的受控工程练习|JavaScript 代码作业/).first()).toBeVisible();
 await expect(page.getByText(/不会上传你输入的代码/)).toBeVisible();
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 await expect(page.getByRole("heading",{name:/校验不可信工单输入/})).toBeVisible();
 await expect(page.getByRole("textbox",{name:"你的JavaScript代码"})).toBeVisible();
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByRole("status").filter({hasText:/需要修正代码/})).toBeVisible({timeout:16000});
 await expect(page.getByText(/0\/4组已通过|1\/4组已通过|2\/4组已通过|3\/4组已通过/)).toBeVisible();
 const validSource="function validateTicket(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='text,ticket_id')return {valid:false,code:'UNEXPECTED_FIELDS'};if(typeof v.ticket_id!=='string'||!/^T-[0-9]{4,8}$/.test(v.ticket_id))return {valid:false,code:'INVALID_ID'};if(typeof v.text!=='string'||v.text.length<1||v.text.length>1000)return {valid:false,code:'INVALID_TEXT'};return {valid:true,code:'OK'}}";
 await page.getByRole("textbox",{name:"你的JavaScript代码"}).fill(validSource);
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByRole("status").filter({hasText:/任务通过 · 4组真实执行全部正确/})).toBeVisible({timeout:16000});
 await expect(page.getByRole("button",{name:"进入下一任务"})).toBeEnabled();
 await page.getByRole("button",{name:"进入下一任务"}).click();
 await expect(page.getByRole("heading",{name:/区分单一与混合意图/})).toBeVisible();
 await expect(page.getByRole("button",{name:"进入下一任务"})).toBeDisabled();
});
test("Agent coding lab is readable on a 390px phone without horizontal overflow",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/skill-labs/engineering/agent");
 await expect(page.getByRole("heading",{level:1,name:/AI Agent 工程 · 真实代码作业/})).toBeVisible();
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await expect(page.getByRole("textbox",{name:"你的JavaScript代码"})).toBeVisible();
});
