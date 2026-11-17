import {test,expect,type Route} from "@playwright/test";

const tenant1="11111111-1111-4111-8111-111111111111";
const tenant2="22222222-2222-4222-8222-222222222222";
const cl1="33333333-3333-4333-8333-333333333333";
const cl2="44444444-4444-4444-8444-444444444444";
const task1="55555555-5555-4555-8555-555555555555";
const task2="66666666-6666-4666-8666-666666666666";
const task3="77777777-7777-4777-8777-777777777777";
const API="/english/pronunciation/classroom-api";
const answer=(route:Route,body:unknown,status=200)=>route.fulfill({
 status,contentType:"application/json",body:JSON.stringify(body)
});
const entry=(id:string,title:string,submitted:boolean,feedback_count:number)=>({
 id,title,lifecycle:"published",published_at:"2026-11-17T10:00:00.000Z",
 sentence_count:2,receipt_status:submitted?"submitted":"in_progress",claimed:true,
 submitted,attempt_count:submitted?2:1,best_score:submitted?89.5:76.5,feedback_count,
});

test("a learner sees only real assignments in their selected class and their own feedback",async({page})=>{
 const requested:string[]=[];
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const path=new URL(route.request().url()).pathname;
  requested.push(path);
  if(path===API+"/student/classes")return answer(route,{classes:[
   {tenant_id:tenant1,class_id:cl1,class_name:"Candy老师英语班",teacher_name:"Candy老师"},
   {tenant_id:tenant2,class_id:cl2,class_name:"英语跟读第二班",teacher_name:"另一位老师"},
  ]});
  if(path===API+"/student/tenants/"+tenant1+"/classes/"+cl1+"/assignments")
   return answer(route,{assignments:[
    entry(task1,"周二朗读练习",false,1),
    entry(task2,"上一期复习",true,0),
   ]});
  if(path===API+"/student/tenants/"+tenant2+"/classes/"+cl2+"/assignments")
   return answer(route,{assignments:[entry(task3,"第二班的专属作业",false,0)]});
  if(path===API+"/student/tenants/"+tenant1+"/assignments/"+task1+"/items")
   return answer(route,{assignment_id:task1,title:"周二朗读练习",lifecycle:"published",
    items:[{ordinal:1,sentence:"An octopus learns from experience."}]});
  if(path===API+"/tenants/"+tenant1+"/assignments/"+task1+"/my-attempts")
   return answer(route,{receipt_status:"in_progress",submitted:false,attempt_count:1,
    attempts:[{attempt_id:"e".repeat(36),score:76.5,time:"2026-11-17T10:00:00.000Z",model_version:"rust"}],
    teacher_feedback:[{comment:"请注意 experience 的重音",at:"2026-11-17T10:05:00.000Z"}]});
  return answer(route,{error:"Unexpected mocked route"},404);
 });
 await page.goto("/english/pronunciation/my-classes");
 await expect(page.getByRole("heading",{name:"Candy老师英语班"})).toBeVisible();
 await expect(page.getByText("周二朗读练习")).toBeVisible();
 await expect(page.getByText("上一期复习")).toBeVisible();
 await expect(page.getByText(/待完成 1 · 已提交 1/)).toBeVisible();
 await expect(page.getByText(/最佳 76.5 分/)).toBeVisible();
 await page.getByRole("button",{name:"查看作业与反馈"}).first().click();
 await expect(page.getByText("An octopus learns from experience.")).toBeVisible();
 await expect(page.getByText("请注意 experience 的重音")).toBeVisible();
 await expect(page.getByText(/使用老师的作业链接继续练习/)).toHaveAttribute(
  "href","/english/pronunciation/next-lab/assignments");
 await page.getByRole("combobox",{name:"切换已加入班级"}).selectOption(tenant2+":"+cl2);
 await expect(page.getByRole("heading",{name:"英语跟读第二班"})).toBeVisible();
 await expect(page.getByText("第二班的专属作业")).toBeVisible();
 await expect(page.getByText("周二朗读练习")).toHaveCount(0);
 await expect(page.getByText("请注意 experience 的重音")).toHaveCount(0);
 expect(requested).toContain(API+"/student/tenants/"+tenant2+"/classes/"+cl2+"/assignments");
 expect(requested).not.toContain(API+"/student/tenants/"+tenant2+"/assignments/"+task1+"/items");
});

test("classroom errors do not block individual learning on a 390px phone",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path===API+"/student/classes")return answer(route,{classes:[
   {tenant_id:tenant1,class_id:cl1,class_name:"学生已加入班",teacher_name:"老师"},
  ]});
  if(path===API+"/student/tenants/"+tenant1+"/classes/"+cl1+"/assignments")
   return answer(route,{error:"课堂数据暂时不可用"},503);
  return answer(route,{error:"not_found"},404);
 });
 await page.goto("/english/pronunciation/my-classes");
 await expect(page.getByRole("alert").filter({hasText:"课堂数据暂时不可用"})).toContainText("课堂数据暂时不可用");
 await expect(page.getByRole("link",{name:"英语跟读练习"})).toBeVisible();
 const width=await page.evaluate(()=>({
  viewport:document.documentElement.clientWidth,
  page:document.documentElement.scrollWidth,
 }));
 expect(width.page).toBeLessThanOrEqual(width.viewport+2);
});


test("independent learners with no teacher remain able to practice",async({page})=>{
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path===API+"/student/classes")return answer(route,{classes:[]});
  return answer(route,{error:"should-not-query-other-classes"},500);
 });
 await page.goto("/english/pronunciation/my-classes");
 await expect(page.getByText("暂未加入老师的班级")).toBeVisible();
 await expect(page.getByRole("link",{name:"先开始英语发音练习"}))
  .toHaveAttribute("href",/^\/english\/pronunciation\/app\/?$/);
 await expect(page.getByRole("heading",{name:"老师布置的跟读作业"})).toHaveCount(0);
});
