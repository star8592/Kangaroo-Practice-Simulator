import {test,expect} from "@playwright/test";
import { submitSignedPractice } from "./utils/signed-arithmetic";
import fs from "node:fs";
import path from "node:path";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "../../src/lib/parent-auth";
import {createStudent,SESSION_COOKIE,userFromSessionToken} from "../../src/lib/auth";
import {addStudentToFamily} from "../../src/lib/family-store";

const root=path.join(process.cwd(),"private","users");
const files=[path.join(root,"parents.json"),path.join(root,"users.json"),path.join(root,"families.json"),path.join(process.cwd(),"private","arithmetic","sessions.jsonl")];
const snapshot=new Map<string,Buffer|null>();
let parentSession="";
let children:{id:string;name:string}[]=[];

test.beforeAll(()=>{
  for(const file of files)snapshot.set(file,fs.existsSync(file)?fs.readFileSync(file):null);
  const seed=String(process.pid);
  const parent=authenticateOrCreateWechatParent({wechatId:"browser-child-switch-"+seed,openId:"browser-open-"+seed,name:"两娃之家"});
  const first=createStudent({username:"family_child_a_"+seed,candidateNo:"SWITCHA"+seed,name:"可乐",grade:2,pin:"123456"});
  const second=createStudent({username:"family_child_b_"+seed,candidateNo:"SWITCHB"+seed,name:"豆豆",grade:5,pin:"654321"});
  addStudentToFamily(parent.id,first.id);addStudentToFamily(parent.id,second.id);
  parentSession=createParentSessionToken(parent.id);
  children=[{id:first.id,name:first.name},{id:second.id,name:second.name}];
});
test.afterAll(()=>{
  for(const [file,value] of snapshot){
    if(value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
    else if(fs.existsSync(file))fs.rmSync(file);
  }
});
test.beforeEach(async({context})=>{
  await context.addCookies([{name:PARENT_SESSION_COOKIE,value:parentSession,
    domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Strict"}]);
});

test("parent chooses two children, and basic practice histories remain separate",async({page,context})=>{
  await page.goto("/parent");
  await expect(page.getByRole("heading",{name:"今天，谁来学数学？"})).toBeVisible();
  await expect(page.getByRole("button",{name:"为可乐开始学习"})).toBeVisible();
  await expect(page.getByRole("button",{name:"为豆豆开始学习"})).toBeVisible();
  await expect(page.locator("#choose-child")).toContainText("2 位孩子");
  await page.getByRole("button",{name:"为可乐开始学习"}).click();
  await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
  await expect(page.getByText("可乐 ·")).toBeVisible({timeout:12000});
  const firstToken=(await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value;
  expect(userFromSessionToken(firstToken)?.id).toBe(children[0].id);
  const firstAttempt=await submitSignedPractice(page.request,children[0].id,2);
  const firstSessions=await (await page.request.get("/api/arithmetic/sessions")).json();
  expect(firstSessions.sessions.some((s:{id:string;studentId:string})=>s.id===firstAttempt&&s.studentId===children[0].id)).toBe(true);
  await page.locator('header button[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem",{name:/切换孩子/}).click();
  await expect(page).toHaveURL(/\/parent#choose-child/);
  await page.getByRole("button",{name:"为豆豆开始学习"}).click();
  await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
  const secondToken=(await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value;
  expect(userFromSessionToken(secondToken)?.id).toBe(children[1].id);
  const secondSessions=await (await page.request.get("/api/arithmetic/sessions")).json();
  expect(secondSessions.sessions.some((s:{id:string})=>s.id===firstAttempt)).toBe(false);
  const secondAttempt=await submitSignedPractice(page.request,children[1].id,5);
  await page.goto("/parent");
  await page.getByRole("button",{name:"为可乐开始学习"}).click();
  await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
  const back=await (await page.request.get("/api/arithmetic/sessions")).json();
  expect(back.sessions.some((s:{id:string})=>s.id===firstAttempt)).toBe(true);
  expect(back.sessions.some((s:{id:string})=>s.id===secondAttempt)).toBe(false);
});

test("household logout clears a parent-delegated child session",async({page,context})=>{
  await page.goto("/parent");
  await page.getByRole("button",{name:"为可乐开始学习"}).click();
  await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/);
  await page.goto("/parent");
  await page.getByRole("button",{name:"退出家长账号"}).click();
  await expect(page).toHaveURL(/\/parent\/login(?:\?|$)/,{timeout:15000});
  const cookies=await context.cookies();
  expect(cookies.some(c=>c.name===SESSION_COOKIE)).toBe(false);
  expect(cookies.some(c=>c.name===PARENT_SESSION_COOKIE)).toBe(false);
});
