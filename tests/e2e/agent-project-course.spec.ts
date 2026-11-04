import {expect,test} from "@playwright/test";

test("Agent project course has real study stages, source boundaries and an interactive check",async({page})=>{
 const response=await page.goto("/skill-labs/agent-foundations");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{level:1,name:"AI Agent 项目制工程课程"})).toBeVisible();
 await page.getByRole("link",{name:"开始项目课程"}).click();
 await expect(page.getByRole("heading",{level:2,name:"完成一个可解释的工单 Agent"})).toBeVisible();
 const course=page.locator("section#agent-project");
 await expect(course.getByRole("button",{name:/输入与工具契约/})).toBeVisible();
 await expect(course.locator("nav button")).toHaveCount(6);
 await expect(course.getByRole("heading",{level:3,name:"工单输入与工具契约"})).toBeVisible();
 await course.getByText("直接处理，因为 ticket_id 合法").click();
 await course.getByRole("button",{name:"核对这道题"}).click();
 await expect(course.getByRole("status")).toContainText("还不准确");
 await course.getByText("拒绝，存在不允许的 admin 字段").click();
 await course.getByRole("button",{name:"核对这道题"}).click();
 await expect(course.getByRole("status")).toContainText("知识检查通过");
 await expect(course.getByText("1/6")).toBeVisible();
 await page.reload();
 await expect(course.getByText("1/6")).toBeVisible();
 await course.getByRole("button",{name:/意图识别与不确定性/}).click();
 await expect(course.getByRole("heading",{level:3,name:"意图识别与不确定性"})).toBeVisible();
 await expect(course.getByText(/仅保存在当前浏览器/)).toBeVisible();
 await expect(page.getByRole("button",{name:/付费|付款|立即购买/})).toHaveCount(0);
});
test("Agent project course fits a narrow mobile screen",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/skill-labs/agent-foundations");
 await page.getByRole("link",{name:"开始项目课程"}).click();
 const course=page.locator("section#agent-project");
 await expect(course.getByRole("button",{name:/故障降级与面试复盘/})).toBeVisible();
 await course.getByRole("button",{name:/故障降级与面试复盘/}).click();
 await expect(course.getByRole("heading",{level:3,name:"故障降级与面试复盘"})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});


test("Agent project work sample really executes learner code, not just MCQ",async({page})=>{
 const response=await page.goto("/skill-labs/agent-foundations");
 expect(response?.status()).toBe(200);
 await page.getByRole("link",{name:"开始代码实训"}).click();
 const lab=page.locator("section#agent-code-lab");
 await expect(lab.getByRole("heading",{level:2,name:"亲手编写工单 Agent 的核心规则"})).toBeVisible();
 await expect(lab.locator("nav button")).toHaveCount(6);
 await lab.getByRole("button",{name:"运行代码并检查"}).click();
 await expect(lab.getByText("代码需要修改")).toBeVisible({timeout:20000});
 await lab.getByRole("textbox",{name:"你的工单 Agent JavaScript 代码"}).fill(
  "function validateTicketPayload(p){if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='text,ticket_id')return {ok:false,code:'FIELDS'};if(typeof p.ticket_id!=='string'||!/^T-[0-9]{4,8}$/.test(p.ticket_id))return {ok:false,code:'ID'};if(typeof p.text!=='string'||p.text.length<1||p.text.length>1000)return {ok:false,code:'TEXT'};return {ok:true,code:'OK'};}"
 );
 await lab.getByRole("button",{name:"运行代码并检查"}).click();
 await expect(lab.getByText("实际代码测试通过")).toBeVisible({timeout:20000});
 await expect(lab.getByText(/5\/5 组通过/)).toBeVisible();
 await expect(lab.getByText(/不保存源码或真实工单数据/)).toBeVisible();
});
