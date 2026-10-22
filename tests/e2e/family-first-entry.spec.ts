import {test, expect} from "@playwright/test";
import { submitSignedPractice } from "./utils/signed-arithmetic";
import fs from "node:fs";
import path from "node:path";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "../../src/lib/parent-auth";
import {SESSION_COOKIE, userFromSessionToken} from "../../src/lib/auth";

const parentFile=path.join(process.cwd(),"private","users","parents.json");
const sessionsFile=path.join(process.cwd(),"private","arithmetic","sessions.jsonl");
let sessionsSnapshot:Buffer|null=null;
let snapshot:Buffer|null=null;
let parentToken="";

test.beforeAll(()=>{
  snapshot=fs.existsSync(parentFile)?fs.readFileSync(parentFile):null;
  sessionsSnapshot=fs.existsSync(sessionsFile)?fs.readFileSync(sessionsFile):null;
  const parent=authenticateOrCreateWechatParent({
    wechatId:"e2e-family-wx-"+process.pid,
    openId:"e2e-family-open-"+process.pid,
    name:"体验家庭",
  });
  parentToken=createParentSessionToken(parent.id);
});
test.afterAll(()=>{
  if(snapshot) fs.writeFileSync(parentFile,snapshot);
  else if(fs.existsSync(parentFile))fs.rmSync(parentFile);
  if(sessionsSnapshot)fs.writeFileSync(sessionsFile,sessionsSnapshot);
  else if(fs.existsSync(sessionsFile))fs.rmSync(sessionsFile);
});
test.beforeEach(async({context})=>{
  await context.addCookies([{name:PARENT_SESSION_COOKIE,value:parentToken,
    domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Strict"}]);
});

test("family scans once and can start child-friendly basic practice without PIN",async({page,context})=>{
  await page.goto("/parent");
  await expect(page.getByRole("heading",{name:"今天，我们练一点数学。"})).toBeVisible();
  await page.screenshot({path:test.info().project.name.includes("mobile")?"/tmp/kps-family-mobile-ux.png":"/tmp/kps-family-desktop-ux.png",fullPage:true});
  const heading=page.getByRole("region",{name:"家庭学习快捷入口"});
  await expect(heading.getByRole("link",{name:/开始计算训练/})).toBeVisible();
  await expect(page.getByText("还没有绑定孩子档案，也没关系。")).toBeVisible();
  await heading.getByRole("link",{name:/开始计算训练/}).click();
  await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
  await expect(page.getByText("微信家庭练习档案")).toBeVisible();
  const token=(await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value||"";
  const identity=userFromSessionToken(token);
  expect(identity?.id).toMatch(/^guest_family_[0-9a-f]{32}$/);
  const id=await submitSignedPractice(page.request,identity!.id,1);
  const beforeReload=await (await page.request.get("/api/arithmetic/sessions")).json();
  expect(beforeReload.sessions.some((s:{id:string;studentId:string})=>s.id===id&&s.studentId===identity?.id)).toBe(true);
  await page.reload();
  const afterReload=await (await page.request.get("/api/arithmetic/sessions")).json();
  expect(afterReload.sessions.some((s:{id:string;studentId:string})=>s.id===id&&s.studentId===identity?.id)).toBe(true);
  expect(userFromSessionToken((await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value)?.id).toBe(identity?.id);
  await page.getByRole("link",{name:/开始 20 题计算诊断/}).click();
  await expect(page).toHaveURL(/\/arithmetic\/session\/\d+\?mode=diagnostic/,{timeout:15000});
});

test("a signed-in family sees a child-account prompt instead of exam redirect loops",async({page})=>{
  await page.goto("/exam/maa-amc12-practice-geometry");
  await expect(page).toHaveURL(/\/login\?next=/,{timeout:15000});
  await expect(page.getByText("微信家庭已登录。完整模拟和个人成长档案需要已有学生账号")).toBeVisible();
  await expect(page.getByLabel("学生 PIN")).toBeVisible();
  await expect(page.getByRole("link",{name:"先去做数学训练"})).toBeVisible();
  // Protect against repeated cross-route navigation when only a parent exists.
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/login\?next=/);
});


test("logout clears family practice but not independent learner accounts",async({page,context})=>{
  await page.goto("/parent");
  await page.getByRole("region",{name:"家庭学习快捷入口"}).getByRole("link",{name:/开始计算训练/}).click();
  await expect(page.getByText("微信家庭练习档案")).toBeVisible();
  await page.goto("/parent");
  await page.getByRole("button",{name:"退出家长账号"}).click();
  await expect(page).toHaveURL(/\/parent\/login(?:\?|$)/,{timeout:15000});
  const cookies=await context.cookies();
  expect(cookies.find(x=>x.name===PARENT_SESSION_COOKIE)).toBeUndefined();
  expect(cookies.find(x=>x.name===SESSION_COOKIE)).toBeUndefined();
});
