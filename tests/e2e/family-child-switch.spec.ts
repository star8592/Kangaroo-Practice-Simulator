import {test,expect} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "../../src/lib/parent-auth";

const parentFile=path.join(process.cwd(),"private/users/parents.json");
let backup:Buffer|null=null;
let a="",b="";
test.beforeAll(()=>{
 backup=fs.existsSync(parentFile)?fs.readFileSync(parentFile):null;
 const first=authenticateOrCreateWechatParent({wechatId:"e2e-one-account-A-"+process.pid,name:"买家 A"});
 const other=authenticateOrCreateWechatParent({wechatId:"e2e-one-account-B-"+process.pid,name:"买家 B"});
 a=createParentSessionToken(first.id);b=createParentSessionToken(other.id);
});
test.afterAll(()=>{
 if(backup){fs.mkdirSync(path.dirname(parentFile),{recursive:true});fs.writeFileSync(parentFile,backup);}
 else if(fs.existsSync(parentFile))fs.rmSync(parentFile);
});
const setBuyer=async (context:import("@playwright/test").BrowserContext,token:string)=>{
 await context.addCookies([{name:PARENT_SESSION_COOKIE,value:token,
   domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Strict"}]);
};
test("one WeChat buyer has only one account and no family-child chooser",async({page,context})=>{
 await setBuyer(context,a);
 await page.goto("/parent");
 await expect(page).toHaveURL(/\/account$/);
 await expect(page.getByRole("heading",{name:"考试与资料"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"买家 A",exact:true})).toBeVisible();
 await expect(page.getByText("添加孩子")).toHaveCount(0);
 await expect(page.getByText("切换孩子")).toHaveCount(0);
 const first=await (await page.request.get("/api/auth/me")).json();
 expect(first.user?.id).toMatch(/^guest_family_[0-9a-f]{32}$/);
 await setBuyer(context,b);
 await page.reload();
 const second=await (await page.request.get("/api/auth/me")).json();
 expect(second.user?.id).toMatch(/^guest_family_[0-9a-f]{32}$/);
 expect(second.user.id).not.toBe(first.user.id);
 await expect(page.getByRole("heading",{name:"买家 B",exact:true})).toBeVisible();
});
test("one WeChat account logout clears its own buyer session",async({page,context})=>{
 await setBuyer(context,a);
 await page.goto("/account");
 await page.getByRole("button",{name:"退出登录"}).first().click();
 await expect(page).toHaveURL(/\/login(?:\?|$)/,{timeout:15000});
 expect((await context.cookies()).some(c=>c.name===PARENT_SESSION_COOKIE)).toBe(false);
 await page.goto("/account");
 await expect(page).toHaveURL(/\/login\?next=/);
});
