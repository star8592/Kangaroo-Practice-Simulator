import {expect,test,type Route} from "@playwright/test";

const tenant="11111111-1111-4111-8111-111111111111";
const classroom="22222222-2222-4222-8222-222222222222";
const assignment="33333333-3333-4333-8333-333333333333";
const set="44444444-4444-4444-8444-444444444444";
const sentence="55555555-5555-4555-8555-555555555555";
const student="66666666-6666-4666-8666-666666666666";
const join="77777777-7777-4777-8777-777777777777";
const attempt="88888888-8888-4888-8888-888888888888";
const token="a".repeat(64);
const url="https://socthink.cn/english/pronunciation/app/a/"+tenant+"/"+token;
const nativeUrl="https://socthink.cn/english/pronunciation/next-lab/assignments/"+tenant+"/"+token;
const api="/english/pronunciation/classroom-api";
const classBase=api+"/tenants/"+tenant+"/classes/"+classroom;
const taskBase=api+"/tenants/"+tenant+"/a/"+token;
const classJoinUrl="https://socthink.cn/english/pronunciation/join/"+tenant+"/"+classroom+"/"+token;
const sentenceText="An octopus learns from experience.";
function respond(route:Route,body:unknown,status=200){
 return route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});
}
test.use({permissions:["microphone"],launchOptions:{
 executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
 args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required"],
}});

test("teacher can publish existing Rust-classroom sentences, approve student and save feedback",async({page})=>{
 const writes:{path:string;body:unknown}[]=[];
 let published=false,admitted=false,invitationEnabled=false;
 let customText:string|null=null,customKey="warm";
 const feedback:{student_id:string;comment:string;at:string}[]=[];
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  const write=req.method()==="POST";
  if(write)writes.push({path,body:req.postDataJSON()});
  if(path===api+"/me")return respond(route,{account_id:"teacher",is_admin:false});
  if(path===api+"/teacher/access")return respond(route,{approved:true});
  if(path===api+"/teacher/classes")return respond(route,{classes:[{id:classroom,tenant_id:tenant,name:"英语六年级"}]});
  if(path===classBase+"/invitation"&&req.method()==="GET")
    return respond(route,{enabled:invitationEnabled,url:invitationEnabled?classJoinUrl:null,
      message_template:customText,template_key:customKey});
  if(path===classBase+"/invitation/rotate"&&req.method()==="POST"){
    invitationEnabled=true;
    return respond(route,{enabled:true,url:classJoinUrl});
  }
  if(path===classBase+"/invitation/copy"&&req.method()==="POST"){
    const body=req.postDataJSON();
    customText=body.message_template;customKey=body.template_key;
    expect(customText).toContain("{{邀请链接}}");
    return respond(route,{saved:true,message_template:customText,template_key:customKey});
  }
  if(path===classBase+"/catalog")return respond(route,{items:[{id:sentence,sentence_set_id:set,
   set_title:"自然科学英语",sentence:sentenceText,ordinal:1}]});
  if(path===classBase+"/assignments/list")return respond(route,{assignments:published?
   [{id:assignment,title:"周三跟读",lifecycle:"published",submitted:1,enrolled_total:1}]:[]});
  if(path===classBase+"/join-requests")return respond(route,{requests:admitted?[]:
   [{id:join,student_name:"学生甲",grade_label:"G6"}]});
  if(path===classBase+"/join-requests/"+join+"/decision"){
   admitted=true;return respond(route,{status:"approved"});
  }
  if(path===classBase+"/assignments"){
   const body=req.postDataJSON();
   expect(body.sentence_ids).toEqual([sentence]);
   expect(body.sentence_set_id).toBe(set);
   published=true;return respond(route,{assignment_id:assignment,share_url:url});
  }
  if(path===api+"/tenants/"+tenant+"/assignments/"+assignment+"/report"){
   return respond(route,{total:1,submitted:1,students:[{student_id:student,name:"学生甲",
    attempts:1,best_score:87,claimed:true,submitted:true}],teacher_feedback:feedback});
  }
  if(path===api+"/tenants/"+tenant+"/assignments/"+assignment+"/feedback"){
   const body=req.postDataJSON();expect(body.student_id).toBe(student);
   expect(body.attempt_id).toBeNull();
   feedback.push({student_id:student,comment:body.comment,at:"2026-11-17T03:30:00Z"});
   return respond(route,{saved:true,feedback_id:join});
  }
  throw Error("Unexpected teacher route "+req.method()+" "+path);
 });
 await page.goto("/english/pronunciation/next-lab/assignments");
 await expect(page.getByRole("region",{name:"教师布置作业"})).toBeVisible();
 await page.getByRole("button",{name:"英语六年级"}).click();
 await page.getByRole("button",{name:"生成本班邀请"}).click();
 const editor=page.getByRole("textbox",{name:"编辑邀请文案"});
 const preview=page.getByRole("textbox",{name:"完整班级邀请预览"});
 await expect(editor).toHaveValue(/{{邀请链接}}/);
 await expect(preview).toHaveValue(new RegExp(classJoinUrl));
 await expect(preview).toHaveValue(/微信登录/);
 await expect(preview).toHaveValue(/审核通过/);
 await page.getByRole("combobox",{name:"邀请文案模板"}).selectOption("formal");
 await expect(editor).toHaveValue(/尊敬的家长/);
 const edited="各位同学、家长好！这是英语跟读学习班，欢迎加入。使用微信登录，填写姓名，等待老师审核。\n\n专属入口：{{邀请链接}}\n\n谢谢大家！";
 await editor.fill(edited);
 await expect(preview).toHaveValue(new RegExp(classJoinUrl));
 await page.getByRole("button",{name:"保存修改"}).click();
 await expect(page.getByText(/邀请文案已保存到班级/)).toBeVisible();
 await page.getByRole("button",{name:/二维码海报/}).click();
 const poster=page.getByRole("img",{name:/完整班级邀请海报/});
 await expect(poster).toBeVisible();
 await expect(poster).toHaveAttribute("src",/^data:image\/png;base64,/);
 await expect(page.getByRole("button",{name:"分享 / 保存邀请海报"})).toBeEnabled();
 await page.getByRole("button",{name:/链接邀请/}).click();
 await expect(preview).toHaveValue(new RegExp(classJoinUrl));
 await page.reload();
 await page.getByRole("button",{name:"英语六年级"}).click();
 await expect(page.getByRole("textbox",{name:"编辑邀请文案"})).toHaveValue(edited);
 await expect(page.getByRole("combobox",{name:"邀请文案模板"})).toHaveValue("formal");
 await expect(page.getByRole("textbox",{name:"完整班级邀请预览"})).toHaveValue(new RegExp(classJoinUrl));
 await expect(page.getByLabel(sentenceText)).toBeVisible();
 await page.getByRole("textbox",{name:"作业名称"}).fill("周三跟读");
 await page.getByRole("checkbox",{name:sentenceText}).check();
 await page.getByRole("button",{name:/发布 1 句作业/}).click();
 await expect(page.getByRole("textbox",{name:"已生成作业链接"})).toHaveValue(nativeUrl);
 await expect(page.getByText(/作业已发布，请复制真实分享链接/)).toBeVisible();
 await page.getByRole("button",{name:"批准入班"}).click();
 await expect(page.getByText(/已批准 学生甲 入班/)).toBeVisible();
 await page.getByRole("button",{name:"查看成绩和反馈"}).click();
 await expect(page.getByLabel("教师作业报告和反馈")).toContainText("87");
 await page.getByRole("button",{name:"写反馈"}).click();
 await page.getByRole("textbox",{name:"给这名学生的纠音反馈"}).fill("建议重点重练 octopus");
 await page.getByRole("button",{name:"保存至课堂"}).click();
 await expect(page.getByLabel("教师作业报告和反馈")).toContainText("建议重点重练 octopus");
 expect(writes.some(x=>x.path.endsWith("/feedback"))).toBeTruthy();
 expect(writes.some(x=>x.path.endsWith("/join-requests/"+join+"/decision"))).toBeTruthy();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("student joins, waits for approval, claims, records WebM and receives real saved grade",async({page})=>{
 let joined:"new"|"pending"|"approved"="new",claimed=false,saved=false;
 const uploads:{id:string;contentType:string;bytes:number}[]=[];
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path===api+"/me")return respond(route,{account_id:student,is_admin:false});
  if(path===api+"/teacher/access")return respond(route,{approved:false});
  if(path===taskBase+"/join-status")return respond(route,{status:joined});
  if(path===taskBase+"/join"&&req.method()==="POST"){
   const body=req.postDataJSON();expect(body.student_name).toBe("学生甲");
   expect(body.grade_label).toBe("G6");
   joined="pending";return respond(route,{status:joined});
  }
  if(path===taskBase&&req.method()==="GET")return respond(route,{
   assignment_id:assignment,title:"周三跟读",items:[{sentence_id:sentence,sentence:sentenceText,ordinal:1}]
  });
  if(path===taskBase+"/claim"){
   claimed=true;return respond(route,{claimed:true,assignment_id:assignment});
  }
  if(path===api+"/tenants/"+tenant+"/assignments/"+assignment+"/my-attempts"){
   return respond(route,{submitted:saved,receipt_status:saved?"submitted":"in_progress",
    attempt_count:saved?1:0,attempts:saved?[{attempt_id:attempt,sentence_id:sentence,
      score:88.4,time:"2026-11-17T03:30:00Z"}]:[],
    teacher_feedback:saved?[{comment:"注意 octopus 结尾发音",at:"2026-11-17T03:45:00Z"}]:[]});
  }
  if(path===taskBase+"/items/"+sentence+"/attempts"&&req.method()==="POST"){
   const id=req.headers()["x-request-id"],contentType=req.headers()["content-type"];
   const bytes=req.postDataBuffer()?.length||0;
   expect(id).toMatch(/^[a-f0-9-]{36}$/i);
   expect(contentType).toMatch(/^audio\/(webm|mp4)$/);
   expect(bytes).toBeGreaterThan(1024);
   expect(claimed).toBe(true);
   uploads.push({id,contentType,bytes});
   saved=true;return respond(route,{score:88.4,attempt_id:attempt,submitted:true,duplicate:false});
  }
  throw Error("Unexpected student route "+req.method()+" "+path);
 });
 await page.goto("/english/pronunciation/next-lab/assignments/"+tenant+"/"+token);
 await expect(page.getByRole("region",{name:"学生领取和提交作业"})).toBeVisible();
 await expect(page.getByRole("textbox",{name:"老师分享到微信群的完整作业链接"})).toHaveValue(url);
 await page.getByRole("button",{name:"验证作业链接"}).click();
 await page.getByRole("textbox",{name:/学生姓名/}).fill("学生甲");
 await page.getByRole("button",{name:"提交入班申请"}).click();
 await expect(page.getByText(/等待老师批准/)).toBeVisible();
 joined="approved";
 await page.getByRole("button",{name:"刷新入班状态"}).click();
 await expect(page.getByRole("heading",{name:/周三跟读/})).toBeVisible();
 await page.getByRole("button",{name:"领取 / 继续本作业"}).click();
 await page.getByRole("button",{name:"开始录音"}).click();
 await expect(page.getByRole("button",{name:"结束录音"})).toBeVisible();
 await page.waitForTimeout(1100);
 await page.getByRole("button",{name:"结束录音"}).click();
 await expect(page.getByLabel("本次录音回听")).toBeVisible();
 await page.getByRole("button",{name:"确认提交录音并评分"}).click();
 await expect(page.getByText(/本句真实 Rust 评分：88.4/)).toBeVisible();
 await expect(page.getByRole("region",{name:"老师给我的反馈"})).toContainText("注意 octopus");
 expect(uploads).toHaveLength(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("Rust upload failure retains audio and same idempotent request ID for retry",async({page})=>{
 const ids:string[]=[];let count=0;
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path===api+"/me")return respond(route,{account_id:student});
  if(path===api+"/teacher/access")return respond(route,{approved:false});
  if(path===taskBase+"/join-status")return respond(route,{status:"approved"});
  if(path===taskBase)return respond(route,{assignment_id:assignment,title:"作业A",
   items:[{sentence_id:sentence,sentence:sentenceText,ordinal:1}]});
  if(path===api+"/tenants/"+tenant+"/assignments/"+assignment+"/my-attempts")
   return respond(route,{submitted:false,receipt_status:"in_progress",attempt_count:0,attempts:[]});
  if(path===taskBase+"/claim")return respond(route,{claimed:true});
  if(path===taskBase+"/items/"+sentence+"/attempts"){
   ids.push(req.headers()["x-request-id"]);count++;
   return count===1?respond(route,{error:"Rust 评分服务暂不可用"},503):
    respond(route,{score:76.6,attempt_id:attempt,submitted:true});
  }
  throw Error("Unexpected retry route "+path);
 });
 await page.goto("/english/pronunciation/next-lab/assignments");
 await page.getByRole("textbox",{name:"老师分享到微信群的完整作业链接"}).fill(url);
 await page.getByRole("button",{name:"验证作业链接"}).click();
 await page.getByRole("button",{name:"领取 / 继续本作业"}).click();
 await page.getByRole("button",{name:"开始录音"}).click();
 await expect(page.getByRole("button",{name:"结束录音"})).toBeVisible();
 await page.waitForTimeout(1100);
 await page.getByRole("button",{name:"结束录音"}).click();
 await page.getByRole("button",{name:"确认提交录音并评分"}).click();
 await expect(page.getByText("Rust 评分服务暂不可用")).toBeVisible();
 await expect(page.getByText(/本句真实 Rust 评分/)).toHaveCount(0);
 await expect(page.getByLabel("本次录音回听")).toBeVisible();
 await page.getByRole("button",{name:"确认提交录音并评分"}).click();
 await expect(page.getByText(/本句真实 Rust 评分：76.6/)).toBeVisible();
 expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1]);
});

test("unlogged visitor cannot access protected work",async({page})=>{
 let reads=0;
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  reads++;const path=new URL(route.request().url()).pathname;
  if(path===api+"/me")return respond(route,{error:"请先使用 SOC THINK 微信登录"},401);
  throw Error("Unauthenticated user cannot call "+path);
 });
 await page.goto("/english/pronunciation/next-lab/assignments");
 await expect(page.getByText("需要登录 SOC THINK")).toBeVisible();
 await expect(page.getByRole("region",{name:"学生领取和提交作业"})).toHaveCount(0);
 expect(reads).toBe(1);
});


test("foreign invitation is rejected before classroom API read",async({page})=>{
 let protectedReads=0;
 await page.route("**/english/pronunciation/classroom-api/**",route=>{
  const path=new URL(route.request().url()).pathname;
  if(path===api+"/me")return respond(route,{account_id:student});
  if(path===api+"/teacher/access")return respond(route,{approved:false});
  protectedReads++;
  throw Error("Foreign link must never trigger classroom API: "+path);
 });
 await page.goto("/english/pronunciation/next-lab/assignments");
 await page.getByRole("textbox",{name:"老师分享到微信群的完整作业链接"})
  .fill("https://not-socthink.example/english/pronunciation/app/a/"+tenant+"/"+token);
 await page.getByRole("button",{name:"验证作业链接"}).click();
 await expect(page.getByText("请输入老师发来的 socthink.cn 原始作业链接")).toBeVisible();
 expect(protectedReads).toBe(0);
});
