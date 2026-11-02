import {test,expect} from "@playwright/test";
import {ENGINEERING_TRACK_LIST} from "../../src/lib/engineering-code-tracks";
import {ENGINEERING_TRACK_REFERENCE} from "../../scripts/engineering_track_reference";
import {ENGINEERING_MOCK_QUESTIONS,ENGINEERING_MOCK_VERSION} from "../../src/lib/engineering-code-exam";

for(const track of ENGINEERING_TRACK_LIST){
 test(track.name+" runs all four real JavaScript tasks and grades 16 inputs",async({page})=>{
  const response=await page.goto("/skill-labs/engineering/"+track.id);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:track.name})).toBeVisible();
  await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
  await page.getByRole("button",{name:"开始编程实操"}).click();
  const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
  for(let i=0;i<track.challenges.length;i++){
   await expect(page.getByText("任务 "+(i+1)+" / 4")).toBeVisible();
   await editor.fill(ENGINEERING_TRACK_REFERENCE[track.challenges[i].id]);
   await page.getByRole("button",{name:"运行代码并核验"}).click();
   await expect(page.getByText("任务通过 · 4组真实执行全部正确")).toBeVisible({timeout:20000});
   await page.getByRole("button",{name:i===3?"查看技能练习报告":"进入下一任务"}).click();
  }
  await expect(page.getByRole("heading",{name:track.focus+"专项训练记录"})).toBeVisible();
  await expect(page.getByText(/完成了\s*4\/4\s*项原创工程任务/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}

test("each track has an independent draft store and cannot overwrite another track",async({page})=>{
 await page.goto("/skill-labs/engineering/frontend");
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await editor.fill("function normalizeSearchTerms(text){return ['draft-fe']}");
 await expect.poll(()=>page.evaluate(()=>Object.values(sessionStorage).some(v=>v.includes("draft-fe")))).toBe(true);
 await page.goto("/skill-labs/engineering/backend");
 await expect(page.getByRole("button",{name:"开始编程实操"})).toBeVisible();
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 await editor.fill("function paginateRecordIds(x){return ['draft-be']}");
 await expect.poll(()=>page.evaluate(()=>Object.values(sessionStorage).some(v=>v.includes("draft-be")))).toBe(true);
 await page.goto("/skill-labs/engineering/frontend");
 await expect(editor).toHaveValue("function normalizeSearchTerms(text){return ['draft-fe']}");
 await page.goto("/skill-labs/engineering/backend");
 await expect(editor).toHaveValue("function paginateRecordIds(x){return ['draft-be']}");
});

test("three learning tracks and coding exam all have genuine catalogue links",async({page})=>{
 await page.goto("/skill-labs");
 for(const track of ENGINEERING_TRACK_LIST)
  await expect(page.locator('a[href="/skill-labs/engineering/'+track.id+'"]')).toBeVisible();
 await expect(page.locator('a[href="/skill-labs/engineering-mock"]')).toBeVisible();
 await page.goto("/career");
 await expect(page.locator('#digital-services a[href="/skill-labs/engineering-mock"]')).toHaveCount(1);
 // Specialty routes are accessible in the skills catalogue; keep career landing concise.
});

test("formal 60-minute mock exam supports code, public sample, review and 100-point result",async({page})=>{
 const res=await page.goto("/skill-labs/engineering-mock");
 expect(res?.status()).toBe(200);
 await expect(page.getByRole("heading",{name:"软件工程岗位 · 综合编程模拟笔试"})).toBeVisible();
 const start=page.getByRole("button",{name:"确认入场 · 开始60分钟模拟"});
 await expect(start).toBeDisabled();
 await page.getByRole("checkbox",{name:/我理解这是本地模拟笔试/}).check();
 await start.click();
 await expect(page.getByRole("timer")).toContainText(/^60:/);
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 for(let i=0;i<ENGINEERING_MOCK_QUESTIONS.length;i++){
  const q=ENGINEERING_MOCK_QUESTIONS[i];
  await expect(page.getByRole("heading",{name:q.task.title})).toBeVisible();
  await editor.fill(ENGINEERING_TRACK_REFERENCE[q.id]);
  if(i===0){
   await page.getByRole("button",{name:"运行公开样例"}).click();
   await expect(page.getByText("公开样例通过",{exact:true})).toBeVisible({timeout:18000});
   await page.getByRole("button",{name:"☆ 标记复查"}).click();
   await expect(page.getByRole("button",{name:"★ 已标记"})).toBeVisible();
  }
  await page.getByRole("button",{name:i===5?"复查并交卷":"下一题"}).click();
 }
 await expect(page.getByRole("heading",{name:"交卷前检查"})).toBeVisible();
 await expect(page.getByText(/已填写6题，未填写0题/)).toBeVisible();
 await page.getByRole("button",{name:"确认交卷 · 自动评分"}).click();
 await expect(page.getByRole("heading",{name:"本次模拟笔试成绩"})).toBeVisible({timeout:35000});
 await expect(page.getByText(/100\s*\/\s*100分/)).toBeVisible();
 await expect(page.getByText("前端开发")).toBeVisible();
 await expect(page.getByText("后端开发")).toBeVisible();
 await expect(page.getByText("测试与SRE")).toBeVisible();
 await expect(page.getByText(/4\/4组通过/)).toHaveCount(6);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
 await page.reload();
 await expect(page.getByRole("heading",{name:"本次模拟笔试成绩"})).toBeVisible();
});

test("mock exam partial credit, public sample only and zero-score blank submission",async({page})=>{
 await page.goto("/skill-labs/engineering-mock");
 await page.getByRole("checkbox",{name:/我理解这是本地模拟笔试/}).check();
 await page.getByRole("button",{name:"确认入场 · 开始60分钟模拟"}).click();
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await editor.fill("function validateSignupForm(){return {valid:true,errors:[]}}");
 await page.getByRole("button",{name:"运行公开样例"}).click();
 await expect(page.getByText("公开样例通过",{exact:true})).toBeVisible({timeout:15000});
 await page.getByRole("button",{name:"交卷复核"}).click();
 await expect(page.getByText("已填写1题，未填写5题。",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:"确认交卷 · 自动评分"}).click();
 await expect(page.getByRole("heading",{name:"本次模拟笔试成绩"})).toBeVisible({timeout:35000});
 await expect(page.getByText(/3\.8\s*\/\s*100分/)).toBeVisible();
 await page.getByRole("button",{name:"重新开始另一场模拟"}).click();
 await page.getByRole("checkbox",{name:/我理解这是本地模拟笔试/}).check();
 await page.getByRole("button",{name:"确认入场 · 开始60分钟模拟"}).click();
 await page.getByRole("button",{name:"交卷复核"}).click();
 await page.getByRole("button",{name:"确认交卷 · 自动评分"}).click();
 await expect(page.getByRole("heading",{name:"本次模拟笔试成绩"})).toBeVisible({timeout:35000});
 await expect(page.getByText(/0\s*\/\s*100分/)).toBeVisible();
});

test("expired exam automatically submits saved code, does not reset countdown",async({page})=>{
 await page.goto("/skill-labs/engineering-mock");
 await page.getByRole("checkbox",{name:/我理解这是本地模拟笔试/}).check();
 await page.getByRole("button",{name:"确认入场 · 开始60分钟模拟"}).click();
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await editor.fill(ENGINEERING_TRACK_REFERENCE["fe-form"]);
 await expect.poll(()=>page.evaluate(version=>Object.values(sessionStorage).some(x=>x.includes(version)),ENGINEERING_MOCK_VERSION)).toBe(true);
 await page.evaluate(version=>{
  const key="socthink:engineering-code-mock:"+version;
  const data=JSON.parse(sessionStorage.getItem(key)||"{}");
  data.deadline=Date.now()-3000;
  sessionStorage.setItem(key,JSON.stringify(data));
 },ENGINEERING_MOCK_VERSION);
 await page.reload();
 await expect(page.getByRole("heading",{name:"本次模拟笔试成绩"})).toBeVisible({timeout:35000});
 await expect(page.getByText(/15\s*\/\s*100分/)).toBeVisible();
});
