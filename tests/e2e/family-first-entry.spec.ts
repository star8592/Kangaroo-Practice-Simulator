import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "../../src/lib/parent-auth";

const parentFile=path.join(process.cwd(),"private/users/parents.json");
let backup:Buffer|null=null,token="";
test.beforeAll(()=>{
 backup=fs.existsSync(parentFile)?fs.readFileSync(parentFile):null;
 const buyer=authenticateOrCreateWechatParent({
  wechatId:"e2e-verified-single-account-"+process.pid, name:"考试用户",
 });
 token=createParentSessionToken(buyer.id);
});
test.afterAll(()=>{
 if(backup){fs.mkdirSync(path.dirname(parentFile),{recursive:true});fs.writeFileSync(parentFile,backup);}
 else if(fs.existsSync(parentFile))fs.rmSync(parentFile);
});
test.beforeEach(async({context})=>{
 await context.addCookies([{name:PARENT_SESSION_COOKIE,value:token,
  domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Strict"}]);
});
test("WeChat buyer goes straight to one account; no child or PIN onboarding",async({page})=>{
 await page.goto("/parent/login");
 await expect(page).toHaveURL(/\/account$/);
 await expect(page.getByText("考试用户")).toBeVisible();
 await expect(page.getByRole("heading",{name:"我的订单与权益"})).toBeVisible();
 await expect(page.getByRole("link",{name:"选择考试或资料"})).toBeVisible();
 await expect(page.getByText("添加孩子")).toHaveCount(0);
 await expect(page.getByLabel("学生 PIN")).toHaveCount(0);
});
test("WeChat buyer has real full-exam permission without a child profile",async({page})=>{
 const res=await page.request.get("/api/exams/maa-amc12-practice-geometry");
 expect(res.status()).not.toBe(401);
 const access=await (await page.request.get("/api/access/me")).json();
 expect(access.accountModel).toBe("single-wechat-buyer");
 expect(access.maxFamilyStudents).toBeUndefined();
 const user=await (await page.request.get("/api/auth/me")).json();
 expect(user.user?.candidateNo).toBe("WECHAT");
});
test("one account can log out without creating a child",async({page,context})=>{
 await page.goto("/account");
 await page.getByRole("button",{name:"退出登录"}).click();
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
 expect((await context.cookies()).some(c=>c.name===PARENT_SESSION_COOKIE)).toBe(false);
});
