import {test,expect} from "@playwright/test";
import {INTERVIEW_PROFILES,selectFollowup} from "../../src/lib/career-interview-scenarios";

test("career landing links to real interview previews instead of a placeholder",async({page})=>{
 await page.goto("/career");
 await expect(page.locator('a[href="/career/interviews"]')).toBeVisible();
 await page.goto("/career/interviews");
 for(const profile of INTERVIEW_PROFILES){
  await expect(page.getByRole("heading",{name:profile.title})).toBeVisible();
  await expect(page.locator('a[href="/career/interviews/'+profile.id+'"]')).toBeVisible();
 }
});
for(const profile of INTERVIEW_PROFILES){
 test(profile.title+" completes five stages, keeps transcript and produces honest report",async({page})=>{
  const res=await page.goto("/career/interviews/"+profile.id);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:profile.title})).toBeVisible();
  await expect(page.getByText(/非AI语义评分/)).toBeVisible();
  const begin=page.getByRole("button",{name:"开始模拟面试"});
  await expect(begin).toBeDisabled();
  await page.getByRole("checkbox",{name:/我理解这是一场非标准化自我练习/}).check();
  await begin.click();
  const textarea=page.getByRole("textbox",{name:profile.questions[0].phase?"你的回答":"你的回答"});
  for(let i=0;i<profile.questions.length;i++){
   const q=profile.questions[i];
   await expect(page.getByText("第 "+(i+1)+" / 5 轮")).toBeVisible();
   await expect(page.getByText(q.prompt,{exact:true})).toBeVisible();
   const answer=i===0?"这是我参加的一次课程项目":"我本人负责这个项目的具体设计、团队协作、需求复核和测试验证。我们记录了前后对比数据，说明了8次迭代中出现的问题与改进方案。";
   await textarea.fill(answer);
   await page.getByRole("button",{name:"提交本题回答 · 接受追问"}).click();
   await expect(page.getByText(selectFollowup(q,answer).text,{exact:true})).toBeVisible();
   const followup="我会先列出自己的负责范围、遇到的实际限制、可比较的方案，再核对执行结果与支持证据。";
   await page.getByRole("textbox",{name:"补充回答"}).fill(followup);
   if(i===0){
    await expect.poll(()=>page.evaluate(()=>Object.values(sessionStorage).some(v=>v.includes("我会先列出自己")))).toBe(true);
    await page.reload();
   }
   await expect(page.getByRole("textbox",{name:"补充回答"})).toHaveValue(followup);
   await page.getByRole("button",{name:i===4?"查看面试复盘":"下一轮面试"}).click();
  }
  await expect(page.getByRole("heading",{name:"请核对每轮回答是否包含这些证据"})).toBeVisible();
  const review=page.locator("input[type=checkbox]");
  expect(await review.count()).toBe(15);
  await review.first().check();
  await page.getByRole("button",{name:"生成个人练习复盘"}).click();
  await expect(page.getByRole("heading",{name:"本次面试复盘"})).toBeVisible();
  await expect(page.getByText("5/5")).toBeVisible();
  await expect(page.getByText("1/15")).toBeVisible();
  await expect(page.getByText("这是我参加的一次课程项目")).toBeVisible();
  await expect(page.getByText("岗位模拟笔试")).toBeVisible();
  const text=await page.locator("main").innerText();
  expect(text).not.toContain("录用概率");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  await page.reload();
  await expect(page.getByRole("heading",{name:"本次面试复盘"})).toBeVisible();
  await expect(page.getByText("5/5")).toBeVisible();
 });
}

test("interview reset requires confirmation and does not share drafts across campus/social",async({page})=>{
 await page.goto("/career/interviews/campus-software");
 await page.getByRole("checkbox",{name:/我理解这是一场非标准化自我练习/}).check();
 await page.getByRole("button",{name:"开始模拟面试"}).click();
 const answer=page.getByRole("textbox",{name:"你的回答"});
 await answer.fill("test-draft-one");
 await expect.poll(()=>page.evaluate(()=>Object.values(sessionStorage).some(v=>v.includes("test-draft-one")))).toBe(true);
 await page.getByRole("button",{name:"重新开始"}).click();
 await expect(page.getByText(/重新开始会清空本标签页/)).toBeVisible();
 await page.getByRole("button",{name:"取消"}).click();
 await expect(answer).toHaveValue("test-draft-one");
 await page.goto("/career/interviews/social-procurement");
 await expect(page.getByRole("button",{name:"开始模拟面试"})).toBeVisible();
 await page.goto("/career/interviews/campus-software");
 await expect(answer).toHaveValue("test-draft-one");
 await page.getByRole("button",{name:"重新开始"}).click();
 await page.getByRole("button",{name:"确认清空"}).click();
 await expect(page.getByRole("button",{name:"开始模拟面试"})).toBeVisible();
 await page.reload();
 await expect(page.getByRole("button",{name:"开始模拟面试"})).toBeVisible();
});
