import {expect,test} from "@playwright/test";

const tenant="11111111-1111-4111-8111-111111111111";
const classroom="22222222-2222-4222-8222-222222222222";
const assignment="33333333-3333-4333-8333-333333333333";
const token="a".repeat(64);
const share="https://socthink.cn/english/pronunciation/app/a/"+tenant+"/"+token;
const base="/english/pronunciation/classroom-api";
function reply(route:import("@playwright/test").Route,data:unknown,status=200){
 return route.fulfill({status,contentType:"application/json",body:JSON.stringify(data)});
}

test("teacher sees only own class report from protected existing GET endpoints",async({page})=>{
 const requested:string[]=[];
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const pathname=new URL(route.request().url()).pathname;
  requested.push(pathname);
  if(pathname===base+"/me")return reply(route,{account_id:"private",is_admin:false});
  if(pathname===base+"/teacher/access")return reply(route,{approved:true,status:"approved"});
  if(pathname===base+"/teacher/classes")return reply(route,{classes:[{id:classroom,tenant_id:tenant,name:"英语六年级"}]});
  if(pathname===base+"/tenants/"+tenant+"/classes/"+classroom+"/assignments/list")
   return reply(route,{assignments:[{id:assignment,title:"周三跟读",lifecycle:"published",
    submitted:1,enrolled_total:2,average_best_score:89.5}]});
  if(pathname===base+"/tenants/"+tenant+"/assignments/"+assignment+"/report")
   return reply(route,{total:2,submitted:1,students:[
    {name:"学生甲",attempts:2,best_score:91,claimed:true,submitted:true},
    {name:"学生乙",attempts:0,best_score:null,claimed:false,submitted:false},
   ]});
  throw Error("Unexpected classroom API route: "+pathname);
 });
 await page.goto("/english/pronunciation/next-lab/classroom");
 await expect(page.getByRole("region",{name:"教师作业报告"})).toBeVisible();
 await page.getByRole("button",{name:"英语六年级"}).click();
 await expect(page.getByRole("button",{name:/周三跟读/})).toContainText("已交 1/2");
 await page.getByRole("button",{name:/周三跟读/}).click();
 await expect(page.getByRole("region",{name:"授权班级详细报告"})).toContainText("学生甲");
 await expect(page.getByRole("region",{name:"授权班级详细报告"})).toContainText("91");
 await expect(page.getByRole("region",{name:"授权班级详细报告"})).toContainText("学生乙");
 expect(requested.some(x=>x.includes("/assignments/"+assignment+"/report"))).toBeTruthy();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("student history requires original invitation and displays only own saved scores",async({page})=>{
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname===base+"/me")return reply(route,{account_id:"private",is_admin:false});
  if(pathname===base+"/teacher/access")return reply(route,{approved:false,status:"not_requested"});
  if(pathname===base+"/tenants/"+tenant+"/a/"+token)return reply(route,{assignment_id:assignment});
  if(pathname===base+"/tenants/"+tenant+"/assignments/"+assignment+"/my-attempts")
   return reply(route,{assignment_id:assignment,attempt_count:1,receipt_status:"submitted",
    submitted:true,attempts:[{attempt_id:"attempt-one",time:"2026-11-17T03:00:00Z",
     score:82.3,model_version:"rust-test-fixture"}]});
  throw Error("Unexpected classroom API route: "+pathname);
 });
 await page.goto("/english/pronunciation/next-lab/classroom");
 await expect(page.getByRole("region",{name:"本人作业历史"})).toBeVisible();
 await expect(page.getByText(/本账号尚无教师权限/)).toBeVisible();
 await page.getByRole("textbox",{name:"作业链接"}).fill(share);
 await page.getByRole("button",{name:"查询我的历史"}).click();
 await expect(page.getByRole("region",{name:"本人已保存评分"})).toContainText("82.3");
 await expect(page.getByRole("region",{name:"本人已保存评分"})).toContainText("rust-test-fixture");
 await page.getByRole("textbox",{name:"作业链接"}).fill("https://attacker.example/english/pronunciation/app/a/"+tenant+"/"+token);
 await page.getByRole("button",{name:"查询我的历史"}).click();
 await expect(page.getByRole("alert")).toContainText("其他域名");
 await expect(page.getByRole("region",{name:"本人已保存评分"})).toHaveCount(0);
});

test("unauthenticated user sees no class or student history",async({page})=>{
 let reads=0;
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  reads++;
  if(new URL(route.request().url()).pathname===base+"/me")
   return reply(route,{error:"请先使用 SOC THINK 微信登录"},401);
  throw Error("Not signed in: other classroom endpoints must not be called");
 });
 await page.goto("/english/pronunciation/next-lab/classroom");
 await expect(page.getByRole("alert")).toContainText("请先登录主站");
 await expect(page.getByRole("region",{name:"本人作业历史"})).toHaveCount(0);
 expect(reads).toBe(1);
});
