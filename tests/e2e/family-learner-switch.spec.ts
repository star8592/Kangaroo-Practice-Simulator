import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "../../src/lib/parent-auth";
import {createStudent,SESSION_COOKIE,userFromSessionToken} from "../../src/lib/auth";
import {addStudentToFamily} from "../../src/lib/family-store";

const usersDir=path.join(process.cwd(),"private","users");
const files=["parents.json","families.json","users.json"].map(n=>path.join(usersDir,n))
  .concat([path.join(process.cwd(),"private","arithmetic","sessions.jsonl")]);
const backups=new Map<string,Buffer|null>();
let parentToken="";
let first:{id:string;name:string},second:{id:string;name:string},old:{id:string;username:string;name:string};

test.beforeAll(()=>{
 for(const file of files)backups.set(file,fs.existsSync(file)?fs.readFileSync(file):null);
 const suffix=process.pid.toString(16);
 const parent=authenticateOrCreateWechatParent({wechatId:"e2e-family-switch-"+suffix,openId:"e2e-switch-open-"+suffix,name:"微信家庭测试"});
 parentToken=createParentSessionToken(parent.id);
 first=createStudent({username:"e2e-a-"+suffix,candidateNo:"E2EA"+suffix,name:"柠檬",grade:2,pin:"234567"});
 second=createStudent({username:"e2e-b-"+suffix,candidateNo:"E2EB"+suffix,name:"橙子",grade:4,pin:"345678"});
 old=createStudent({username:"e2e-old-"+suffix,candidateNo:"E2EO"+suffix,name:"原来的学生",grade:3,pin:"456789"});
 addStudentToFamily(parent.id,first.id);
 addStudentToFamily(parent.id,second.id);
});
test.afterAll(()=>{
 for(const [file,bytes] of backups){
  if(bytes===null){if(fs.existsSync(file))fs.rmSync(file)}
  else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes)}
 }
});
test.beforeEach(async({context})=>{
 await context.addCookies([{name:PARENT_SESSION_COOKIE,value:parentToken,domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Strict"}]);
});

test("one WeChat family switches two children without mixing arithmetic history",async({page,context})=>{
 await page.goto("/parent");
 await expect(page.getByRole("heading",{name:"点一下孩子的头像，直接开始"})).toBeVisible();
 await page.getByRole("button",{name:"以柠檬的身份开始计算训练"}).click();
 await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
 await expect(page.getByText(/柠檬 · E2EA/)).toBeVisible();
 let session=(await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value||"";
 expect(userFromSessionToken(session)?.id).toBe(first.id);
 const id="e2e-family-switch-"+process.pid;
 expect((await page.request.post("/api/arithmetic/sessions",{data:{
   id,studentId:"forged",grade:2,mode:"diagnostic",startedAt:Date.now(),finishedAt:Date.now(),attempts:[],
 }})).status()).toBe(200);
 await page.goto("/parent");
 await page.getByRole("button",{name:"以橙子的身份开始计算训练"}).click();
 await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/);
 await expect(page.getByText(/橙子 · E2EB/)).toBeVisible();
 session=(await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value||"";
 expect(userFromSessionToken(session)?.id).toBe(second.id);
 let history=await (await page.request.get("/api/arithmetic/sessions")).json();
 expect(history.sessions.some((x:{id:string})=>x.id===id)).toBe(false);
 await page.goto("/parent");
 await page.getByRole("button",{name:"以柠檬的身份开始计算训练"}).click();
 await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/);
 history=await (await page.request.get("/api/arithmetic/sessions")).json();
 expect(history.sessions.some((x:{id:string;studentId:string})=>x.id===id&&x.studentId===first.id)).toBe(true);
 await page.goto("/parent");
 await page.getByRole("button",{name:"先用家庭体验档案"}).click();
 await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/);
 expect(userFromSessionToken((await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value)?.id).toMatch(/^guest_family_/);
});

test("an existing student can be linked once with PIN and immediately keep the same ID",async({page,context})=>{
 await page.goto("/parent");
 await page.getByRole("button",{name:"已有学生账号？关联原来的成绩"}).click();
 const form=page.getByRole("form",{name:"关联已有学生账号"});
 await form.getByRole("textbox",{name:"原学生账号 / 准考证号"}).fill(old.username);
 await form.getByLabel("原学生 PIN").fill("456789");
 await form.getByRole("button",{name:"验证并关联"}).click();
 await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
 expect(userFromSessionToken((await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value)?.id).toBe(old.id);
 await expect(page.getByText(/原来的学生 · E2EO/)).toBeVisible();
});

test("a first-time child only needs a name and grade",async({page,context})=>{
 await page.goto("/parent");
 await page.getByRole("button",{name:/建立孩子档案/}).first().click();
 const form=page.getByRole("form",{name:"添加孩子"});
 await form.getByPlaceholder("例如：小可乐").fill("新来的小朋友");
 await form.getByPlaceholder("例如：2").fill("2");
 await form.getByRole("button",{name:"建立档案并开始练习"}).click();
 await expect(page).toHaveURL(/\/arithmetic(?:\?|$)/,{timeout:15000});
 await expect(page.getByText(/新来的小朋友 · F/)).toBeVisible();
 expect(userFromSessionToken((await context.cookies()).find(x=>x.name===SESSION_COOKIE)?.value)?.id).toMatch(/^stu_/);
});
