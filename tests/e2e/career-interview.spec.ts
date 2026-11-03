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

test("pasted job requirements and experience affect the actual follow-up, persist, and clear on reset",async({page})=>{
 await page.goto("/career/interviews/campus-software");
 await page.getByRole("textbox",{name:"目标岗位名称"}).fill("前端工程师");
 await page.getByRole("textbox",{name:"招聘要求 / JD"}).fill("招聘熟悉 TypeScript 和 React 的前端研发工程师");
 await page.getByRole("textbox",{name:"你的相关经历摘要"}).fill("我在一个React课程项目中参与页面设计。");
 await expect(page.getByText(/从JD识别的关键词/)).toBeVisible();
 await expect(page.getByText(/尚未提及：TypeScript/)).toBeVisible();
 await page.getByRole("checkbox",{name:/我理解这是一场非标准化自我练习/}).check();
 await page.getByRole("button",{name:"开始模拟面试"}).click();
 await expect(page.getByText(/本场岗位：前端工程师/)).toBeVisible();
 await page.getByRole("textbox",{name:"你的回答"}).fill("我做过一个前端课程项目");
 await page.getByRole("button",{name:"提交本题回答 · 接受追问"}).click();
 await expect(page.getByText(/招聘描述涉及「TypeScript」/)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Object.values(sessionStorage).some(v=>v.includes("招聘熟悉 TypeScript")))).toBe(true);
 await page.reload();
 await expect(page.getByText(/招聘描述涉及「TypeScript」/)).toBeVisible();
 await page.getByRole("button",{name:"重新开始"}).click();
 await page.getByRole("button",{name:"确认清空"}).click();
 await expect(page.getByRole("textbox",{name:"招聘要求 / JD"})).toHaveValue("");
 await expect(page.getByRole("textbox",{name:"你的相关经历摘要"})).toHaveValue("");
 await expect(page.getByRole("textbox",{name:"目标岗位名称"})).toHaveValue("");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("explicit opt-in sends the current answer and displays a model-grounded follow-up",async({page})=>{
 let called=0;
 let sessions=0;
 await page.route("**/api/career/interviews/session",async route=>{
  sessions++;
  const request=route.request().postDataJSON();
  expect(request.profileId).toBe("campus-software");
  expect(request.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({sessionId:"cais_"+"a".repeat(32),duplicated:false})});
 });
 await page.route("**/api/career/interviews/followup**",async route=>{
  if(route.request().method()==="GET"){
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({enabled:true,provider:"external"})});
   return;
  }
  called++;
  const submitted=route.request().postDataJSON();
  expect(submitted.profileId).toBe("campus-software");
  expect(submitted.questionId).toBe("cs-intro");
  expect(submitted.answer).toContain("订单重复");
  expect(submitted.sessionId).toBe("cais_"+"a".repeat(32));
  expect(submitted.context.jobDescription).toContain("数据库");
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   mode:"semantic",question:"你提到订单重复，能说明如何构造并发重试实验来验证幂等性吗？",
   evidenceQuote:"订单重复",reason:"缺少具体测试过程和独立验收证据"
  })});
 });
 await page.goto("/career/interviews/campus-software");
 await page.getByRole("textbox",{name:"招聘要求 / JD"}).fill("需要数据库设计与系统可靠性经验");
 await page.getByRole("checkbox",{name:/启用AI语义追问/}).check();
 await page.getByRole("checkbox",{name:/我理解这是一场非标准化自我练习/}).check();
 await page.getByRole("button",{name:"开始模拟面试"}).click();
 await page.getByRole("textbox",{name:"你的回答"}).fill("我曾解决过订单重复的问题，做过相关开发。");
 await page.getByRole("button",{name:"提交本题回答 · 接受追问"}).click();
 await expect(page.getByText(/能说明如何构造并发重试实验/)).toBeVisible();
 await expect(page.getByText(/追问依据：.*订单重复/)).toBeVisible();
 expect(called).toBe(1);
 expect(sessions).toBe(1);
 await page.reload();
 await expect(page.getByText(/能说明如何构造并发重试实验/)).toBeVisible();
 await page.getByRole("textbox",{name:"补充回答"}).fill("我会记录重试是否生成重复订单，并确认唯一约束有效。");
 await page.getByRole("button",{name:"下一轮面试"}).click();
 const renewedConsent=page.getByRole("checkbox",{name:/本轮启用AI语义追问/});
 await expect(renewedConsent).not.toBeChecked();
 await renewedConsent.check();
 await expect(renewedConsent).toBeChecked();
});

test("no AI consent never sends an answer; model outage falls back safely",async({page})=>{
 let posts=0;
 let sessions=0;
 await page.route("**/api/career/interviews/session",async route=>{
  sessions++;
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({sessionId:"cais_"+"b".repeat(32),duplicated:false})});
 });
 await page.route("**/api/career/interviews/followup**",async route=>{
  if(route.request().method()==="GET"){
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({enabled:true,provider:"local"})});
  }else{
   posts++;
   await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({code:"MODEL_UNAVAILABLE"})});
  }
 });
 await page.goto("/career/interviews/social-procurement");
 await page.getByRole("checkbox",{name:/我理解这是一场非标准化自我练习/}).check();
 await page.getByRole("button",{name:"开始模拟面试"}).click();
 await page.getByRole("textbox",{name:"你的回答"}).fill("我负责供应商项目，但还没想好怎么衡量绩效。");
 await page.getByRole("button",{name:"提交本题回答 · 接受追问"}).click();
 expect(posts).toBe(0);
 expect(sessions).toBe(0);
 await expect(page.getByText("面试官 · 规则追问")).toBeVisible();
 await page.getByRole("button",{name:"重新开始"}).click();
 await page.getByRole("button",{name:"确认清空"}).click();
 await page.getByRole("checkbox",{name:/启用AI语义追问/}).check();
 await page.getByRole("checkbox",{name:/我理解这是一场非标准化自我练习/}).check();
 await page.getByRole("button",{name:"开始模拟面试"}).click();
 await page.getByRole("textbox",{name:"你的回答"}).fill("我负责供应商管理，通过会议跟进合同，但没有建立清晰的业绩指标。");
 await page.getByRole("button",{name:"提交本题回答 · 接受追问"}).click();
 await expect(page.getByText("面试官 · 规则追问")).toBeVisible();
 expect(posts).toBe(1);
 expect(sessions).toBe(1);
});

test("guided mode selects a pre-reviewed follow-up and discloses approved backup providers",async({page})=>{
 let posts=0;
 await page.route("**/api/career/interviews/session",async route=>{
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({sessionId:"cais_"+"c".repeat(32),duplicated:false})});
 });
 await page.route("**/api/career/interviews/followup**",async route=>{
  if(route.request().method()==="GET"){
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
    enabled:true,provider:"external",providers:["小米 MiMo","DeepSeek"]
   })});
   return;
  }
  posts++;
  const body=route.request().postDataJSON();
  expect(body.questionId).toBe("cs-intro");
  expect(body.sessionId).toBe("cais_"+"c".repeat(32));
  expect(body.answer).toContain("亲自负责");
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   mode:"guided",
   question:INTERVIEW_PROFILES[0].questions[0].followups.ownership,
   branch:"ownership",evidenceQuote:"亲自负责",reason:"需要核实个人工作范围和可验证的贡献",
   provider:"DeepSeek",viaBackup:true,latencyMs:210
  })});
 });
 await page.goto("/career/interviews/campus-software");
 await expect(page.getByText(/小米 MiMo、DeepSeek/)).toBeVisible();
 await page.getByRole("checkbox",{name:/启用AI语义追问/}).check();
 await page.getByRole("checkbox",{name:/我理解这是一场非标准化自我练习/}).check();
 await page.getByRole("button",{name:"开始模拟面试"}).click();
 await page.getByRole("textbox",{name:"你的回答"}).fill("我亲自负责课程项目中的接口设计与数据库建模。");
 await page.getByRole("button",{name:"提交本题回答 · 接受追问"}).click();
 await expect(page.getByText("面试官 · AI判断 · 预审追问")).toBeVisible();
 await expect(page.getByRole("heading",{name:INTERVIEW_PROFILES[0].questions[0].followups.ownership})).toBeVisible();
 await expect(page.getByText(/追问依据：.*亲自负责/)).toBeVisible();
 expect(posts).toBe(1);
});

test("published AI interview plans offer both one-off sessions and manual monthly access",async({page})=>{
 let orderedProduct="";
 await page.route("**/api/career/interviews/offer?profileId=campus-software",async route=>{
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   available:true,loggedIn:true,remainingSessions:3,perUseRemaining:1,monthlyRemaining:2,
   monthlyActiveUntil:"2026-12-03T12:00:00.000Z",activeSessions:0,
   offers:[
    {kind:"service",id:"career_campus_two_test",contentKind:"career_interview",contentId:"campus-software",
     titleZh:"软件研发面试两场",billingMode:"per_use",sessions:2,priceMinor:399,currency:"CNY"},
    {kind:"service",id:"career_campus_month_test",contentKind:"career_interview",contentId:"campus-software",
     titleZh:"软件研发30天30场",billingMode:"monthly",sessions:30,priceMinor:1299,currency:"CNY"}
   ]
  })});
 });
 await page.route("**/api/payments/wechat/checkout",async route=>{
  const body=route.request().postDataJSON();
  orderedProduct=body.productId;
  expect(body.policyAccepted).toBe(true);
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   orderId:"ord_mockpayment01",qrDataUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==",
   priceMinor:399,currency:"CNY",qrTtlSeconds:180,status:"pending"
  })});
 });
 await page.route("**/api/payments/wechat/orders/ord_mockpayment01",async route=>{
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   orderId:"ord_mockpayment01",status:"paid",priceMinor:399,currency:"CNY"
  })});
 });
 await page.goto("/career/interviews/campus-software");
 await expect(page.getByText("专业 AI 面试")).toBeVisible();
 await expect(page.getByText("按次购买",{exact:true})).toBeVisible();
 await expect(page.getByText("包月购买",{exact:true})).toBeVisible();
 await expect(page.getByText("2场 · ¥3.99")).toBeVisible();
 await expect(page.getByText("30场 · ¥12.99")).toBeVisible();
 await expect(page.getByText(/可用 3 场/)).toBeVisible();
 const checkout=page.getByRole("region",{name:"微信扫码购买"});
 await expect(checkout.getByRole("button",{name:"微信扫码购买"})).toHaveCount(2);
 await checkout.getByRole("checkbox").first().check();
 await checkout.getByRole("button",{name:"微信扫码购买"}).first().click();
 await expect.poll(()=>orderedProduct).toBe("career_campus_two_test");
 await expect(page.getByRole("link",{name:"返回面试，加载已购权益"})).toHaveAttribute(
  "href","/career/interviews/campus-software");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("unpublished AI plans show two purchase methods without invented prices or checkout",async({page})=>{
 await page.route("**/api/career/interviews/offer?profileId=social-procurement",async route=>{
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
   available:false,loggedIn:false,offers:[],reason:"CAREER_SERVICE_NOT_PUBLISHED"
  })});
 });
 await page.goto("/career/interviews/social-procurement");
 await expect(page.getByText("专业 AI 面试")).toBeVisible();
 await expect(page.getByText("当前尚未开放 AI 面试购买，以下免费结构化练习可正常使用。")).toBeVisible();
 await expect(page.getByRole("button",{name:"微信扫码购买"})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"开始模拟面试"})).toBeVisible();
});
