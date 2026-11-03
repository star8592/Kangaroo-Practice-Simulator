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
