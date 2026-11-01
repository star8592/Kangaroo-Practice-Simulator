import {test,expect} from "@playwright/test";
import {APTITUDE_ITEMS,APTITUDE_VERSION} from "../../src/lib/career-aptitude-bank";
const EXAM="/assessment-center/career-aptitude-40";

test("original 40-item recruitment mock: admission, skip, flag, local resume and blank-paper review",async({page})=>{
 const response=await page.goto(EXAM);
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{name:"招聘通用能力 · 40题"})).toBeVisible();
 const start=page.getByRole("button",{name:"确认入场 · 开始模拟"});
 await expect(start).toBeDisabled();
 await page.getByRole("checkbox",{name:/我理解这是本站原创练习卷/}).check();
 await start.click();
 await expect(page.getByRole("timer")).toContainText("45:");
 await page.locator('input[type="radio"]').nth(APTITUDE_ITEMS[0].answer).check();
 await page.getByRole("button",{name:"下一题"}).click();
 await page.getByRole("button",{name:"☆ 标记复查"}).click();
 await expect(page.getByRole("button",{name:"★ 已标记"})).toHaveAttribute("aria-pressed","true");
 await page.reload();
 await expect(page.getByRole("button",{name:"★ 已标记"})).toBeVisible();
 await expect(page.getByText("第 2 / 40 题")).toBeVisible();
 await page.getByRole("button",{name:"答题总览 / 提前交卷"}).click();
 await expect(page.getByRole("heading",{name:"交卷前检查"})).toBeVisible();
 await expect(page.getByText(/已答 1 题 · 未答 39 题/)).toBeVisible();
 await page.getByRole("button",{name:/第2题，未答，已标记/}).click();
 await expect(page.getByRole("button",{name:"★ 已标记"})).toBeVisible();
 await page.getByRole("button",{name:"答题总览 / 提前交卷"}).click();
 await page.getByRole("button",{name:"确认交卷 · 查看成绩"}).click();
 await expect(page.getByRole("heading",{name:"本次模拟成绩"})).toBeVisible();
 await expect(page.getByText(/答对/).first()).toContainText("1 / 40");
 await page.getByText("查看40题逐题解析与原始作答").click();
 await expect(page.locator("ol").last().locator("li")).toHaveCount(40);
 await page.reload();
 await expect(page.getByRole("heading",{name:"本次模拟成绩"})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
 await page.getByRole("button",{name:"重新模拟"}).click();
 await expect(start).toBeDisabled();
});

test("full 40-item paper can be scored with independent five-domain totals",async({page})=>{
 await page.goto(EXAM);
 await page.getByRole("checkbox",{name:/我理解这是本站原创练习卷/}).check();
 await page.getByRole("button",{name:"确认入场 · 开始模拟"}).click();
 for(let i=0;i<APTITUDE_ITEMS.length;i++){
  await expect(page.getByText("第 "+(i+1)+" / 40 题")).toBeVisible();
  await page.locator('input[type="radio"]').nth(APTITUDE_ITEMS[i].answer).check();
  await page.getByRole("button",{name:i===39?"检查交卷":"下一题"}).click();
 }
 await expect(page.getByRole("heading",{name:"交卷前检查"})).toBeVisible();
 await expect(page.getByText(/已答 40 题 · 未答 0 题/)).toBeVisible();
 await page.getByRole("button",{name:"确认交卷 · 查看成绩"}).click();
 await expect(page.getByRole("heading",{name:"本次模拟成绩"})).toBeVisible();
 await expect(page.getByText(/答对/).first()).toContainText("40 / 40");
 for(const name of ["言语理解","数量运算","逻辑推理","资料分析","空间推理"]){
  const card=page.getByText(name,{exact:true}).locator("..");
  await expect(card).toContainText(/8\s*\/\s*8/);
 }
});

test("expired locally restored attempt is auto-submitted without invented marks",async({page})=>{
 await page.goto("/");
 await page.evaluate(({version})=>{
  sessionStorage.setItem("socthink:career-aptitude:"+version,JSON.stringify({
   version,stage:"questions",answers:{},flagged:{},index:0,deadline:Date.now()-1500,timedOut:false
  }));
 },{version:APTITUDE_VERSION});
 await page.goto(EXAM);
 await expect(page.getByRole("heading",{name:"本次模拟成绩"})).toBeVisible();
 await expect(page.getByText(/考试计时结束/)).toBeVisible();
 await expect(page.getByText(/答对/).first()).toContainText("0 / 40");
});

test("career marketplace links only to actually running aptitude and SQL examinations",async({page})=>{
 const res=await page.goto("/career");
 expect(res?.status()).toBe(200);
 const section=page.locator("#digital-services");
 const aptitude=section.getByRole("link",{name:"开始模拟"});
 await expect(aptitude).toHaveAttribute("href","/assessment-center/career-aptitude-40");
 await expect(section.getByRole("link",{name:"进入实操"})).toHaveAttribute("href","/skill-labs/sql-lab");
 await aptitude.click();
 await expect(page).toHaveURL(/\/assessment-center\/career-aptitude-40$/);
 await expect(page.getByRole("heading",{name:"招聘通用能力 · 40题"})).toBeVisible();
});
