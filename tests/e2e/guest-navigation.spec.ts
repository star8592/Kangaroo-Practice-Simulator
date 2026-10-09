import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const protectedExam="/exam/maa-amc12-practice-geometry";
const fixtureExamId="e2e-browser-amc12-fixture";
const fixtureRoot=path.join(process.cwd(),"private");
const fixtureFile=path.join(fixtureRoot,"exams",fixtureExamId+".json");
const usersFile=path.join(fixtureRoot,"users","users.json");
const sessionsFile=path.join(fixtureRoot,"users","exam-sessions.json");
const attemptsFile=path.join(fixtureRoot,"users","exam-attempts.jsonl");
const followsFile=path.join(fixtureRoot,"users","world-competition-follows.json");
let account:{id:string;username:string;pin:string}|undefined;

function readArray(file:string):Record<string,unknown>[] {
  if(!fs.existsSync(file))return [];
  const value=JSON.parse(fs.readFileSync(file,"utf8"));
  if(!Array.isArray(value))throw new Error("Refusing to overwrite malformed fixture store");
  return value;
}
test.beforeAll(()=>{
  if(process.env.E2E_ALLOW_SYNTHETIC_FIXTURE!=="1")throw new Error("E2E fixture requires explicit isolated-workspace permission");
  if(fs.existsSync(fixtureFile))throw new Error("Refusing to overwrite an existing exam fixture");
  fs.mkdirSync(path.dirname(fixtureFile),{recursive:true});
  fs.mkdirSync(path.dirname(usersFile),{recursive:true});
  const questions=Array.from({length:25},(_,i)=>({
    id:"e2e-browser-amc12-q"+String(i+1).padStart(2,"0"),
    year:2026,level:"AMC12",grades:"11–12",language:"zh",questionNo:i+1,points:6,
    answerMode:"choice",concept:"arithmetic",stem:"E2E synthetic question: 2 + 2 = ?",
    stemEn:"E2E synthetic question: 2 + 2 = ?",
    choices:[{key:"A",label:"3"},{key:"B",label:"4"},{key:"C",label:"5"},{key:"D",label:"6"}],
    answer:"B",solution:"2 + 2 = 4",sourceFile:"e2e-only",examReady:true
  }));
  const profile={
    id:fixtureExamId,name:"E2E Synthetic AMC12",nameZh:"E2E 浏览器模拟试卷",country:"MAA AMC",year:2026,
    grades:"11–12",competitionId:"maa-amc",formatId:"maa-amc12",paperType:"sample",gradeBand:"11+",
    questionCount:25,durationSeconds:4500,initialScore:0,maxScore:150,
    wrongPenaltyMode:"fixed",wrongPenaltyValue:0,blankScoreValue:1.5,
    timingMode:"official",sourceLabel:"Synthetic test only"
  };
  fs.writeFileSync(fixtureFile,JSON.stringify({profile,questions}));
  const id="stu_e2e_"+crypto.randomBytes(8).toString("hex");
  const pin=crypto.randomInt(100000,999999).toString();
  const salt=crypto.randomBytes(16).toString("hex");
  const key=crypto.scryptSync(pin,salt,32,{N:16384,r:8,p:1}).toString("hex");
  account={id,username:id,pin};
  const users=readArray(usersFile);
  users.push({id,username:id,candidateNo:"E2E"+id.slice(-8),name:"Synthetic Student",
    grade:12,onboardingCompleted:true,pinHash:"scrypt$"+salt+"$"+key,
    createdAt:Date.now(),active:true,role:"student",sessionVersion:1});
  fs.writeFileSync(usersFile,JSON.stringify(users));
});
test.afterAll(()=>{
  if(fs.existsSync(fixtureFile))fs.rmSync(fixtureFile);
  if(!account)return;
  if(fs.existsSync(usersFile))fs.writeFileSync(usersFile,JSON.stringify(readArray(usersFile).filter(x=>x.id!==account?.id)));
  if(fs.existsSync(sessionsFile))fs.writeFileSync(sessionsFile,JSON.stringify(readArray(sessionsFile).filter(x=>x.userId!==account?.id)));
  if(fs.existsSync(followsFile))fs.writeFileSync(followsFile,JSON.stringify(readArray(followsFile).filter(x=>x.userId!==account?.id)));
  if(fs.existsSync(attemptsFile)){
    const remaining=fs.readFileSync(attemptsFile,"utf8").split("\n").filter(line=>line.trim()&&JSON.parse(line).userId!==account?.id);
    fs.writeFileSync(attemptsFile,remaining.length?remaining.join("\n")+"\n":"");
  }
});

test("homepage competition CTA opens competition centre",async({page})=>{
  await page.goto("/");
  await page.getByRole("link",{name:/探索全球数学赛事|Explore competitions/}).first().click();
  await expect(page).toHaveURL(/\/competitions(?:\?|$)/);
  await expect(page.getByRole("region",{name:/全球数学赛事管家|World math competition companion/})).toBeVisible();
});
test("homepage student login CTA opens usable login form",async({page})=>{
  await page.goto("/");
  await page.getByRole("link",{name:/学生登录|Student login/}).first().click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
test("anonymous and arithmetic guest cannot enter full exam",async({page,context})=>{
  await page.goto(protectedExam);
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
  expect((await context.cookies()).some(c=>c.name==="kangaroo_session")).toBe(false);
  await page.goto("/");
  await page.getByRole("link",{name:/开始能力诊断|Start a diagnostic/}).first().click();
  await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
  // The URL can settle before the redirected response cookie has been committed.\n  // Wait for the browser session itself, not only navigation completion.\n  await expect.poll(async()=> (await context.cookies()).some(c=>c.name==="kangaroo_session"),{timeout:10000}).toBe(true);
  await page.goto(protectedExam);
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
});


test("real exam card click, registered login, start, answer and submit",async({page})=>{
  if(!account)throw new Error("synthetic login fixture missing");
  await page.goto("/competitions?c=maa-amc");
  await page.getByRole("button",{name:"AMC 12",exact:true}).click();
  const card=page.locator("article").filter({has:page.getByRole("heading",{name:"E2E 浏览器模拟试卷"})});
  await expect(card).toBeVisible();
  await card.getByRole("button",{name:"开始考试"}).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("学生账号 / 准考证号").fill(account.username);
  await page.getByLabel("学生 PIN").fill(account.pin);
  await page.getByRole("button",{name:"登录学生系统"}).click();
  await expect(page).toHaveURL(new RegExp("/exam/"+fixtureExamId+"$"),{timeout:15000});
  await page.getByRole("button",{name:"确认信息并开始考试"}).click();
  await expect(page.locator(".question-stem")).toContainText("2 + 2");
  const sidResponse=await page.request.get("/api/exam-sessions?examId="+fixtureExamId);
  expect(sidResponse.status()).toBe(200);
  const active=await sidResponse.json();
  const sid=active.session.id as string;
  await page.locator(".choice-list button").nth(1).click();
  await page.getByRole("button",{name:"交卷",exact:true}).click();
  await page.getByRole("button",{name:"确认提交"}).click();
  await expect(page).toHaveURL(/\/result(?:\?|$)/,{timeout:15000});
  await expect(page.getByRole("heading",{name:"本次成绩"})).toBeVisible();
  await expect(page.getByRole("link",{name:"逐题复盘"})).toBeVisible();
  // Production code uses the same exact authenticated recovery endpoint.
  const receipt=await page.request.get("/api/exam-sessions/recovery?examId="+fixtureExamId+"&sessionId="+sid);
  expect(receipt.status()).toBe(200);
  const recovered=await receipt.json();
  expect(recovered.status).toBe("completed");
  expect(recovered.result.attemptId).toMatch(/^att_/);
  expect(recovered.result.correct).toBe(1);
  const duplicate=await page.request.post("/api/grade",{data:{
    examId:fixtureExamId,sessionId:sid,answers:{"e2e-browser-amc12-q01":"B"},events:[]
  }});
  expect(duplicate.status()).toBe(200);
  expect((await duplicate.json()).attemptId).toBe(recovered.result.attemptId);
});


test("logged-in student follows UKMT and sees it in their personal calendar", async ({page})=>{
  if(!account)throw new Error("student login fixture missing");
  await page.goto("/login");
  await page.getByLabel("学生账号 / 准考证号").fill(account.username);
  await page.getByLabel("学生 PIN").fill(account.pin);
  await page.getByRole("button",{name:"登录学生系统"}).click();
  await expect(page).toHaveURL(/\/(?:\?|$)/,{timeout:15000});
  await expect.poll(async()=> (await page.context().cookies()).some(c=>c.name==="kangaroo_session"),{timeout:10000}).toBe(true);
  await page.goto("/competitions?event=ukmt");
  const hub=page.getByRole("region",{name:"全球数学赛事管家"});
  await hub.getByRole("button",{name:"＋ 关注赛事"}).click();
  await expect(hub.getByRole("button",{name:/已关注 · 取消关注/})).toBeVisible();
  await hub.getByRole("link",{name:"打开我的赛历 →"}).click();
  await expect(page).toHaveURL(/\/student\/calendar(?:\?|$)/);
  await expect(page.getByRole("heading",{name:"我的数学赛历"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"英国 UKMT"})).toBeVisible();
  await expect(page.getByText("核实当地赛区与参赛资格",{exact:true})).toBeVisible();
  await expect(page.getByText("具体赛区报名及考试日期：按当届官方公告核实；关注不代表报名成功。")).toBeVisible();
  await page.getByRole("link",{name:"打开赛事管家 →"}).click();
  await expect(page).toHaveURL(/\/competitions\?event=ukmt$/);
  await hub.getByRole("button",{name:/已关注 · 取消关注/}).click();
  await expect(hub.getByRole("button",{name:"＋ 关注赛事"})).toBeVisible();
});
