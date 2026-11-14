#!/usr/bin/env npx tsx
/**
 * Isolated native Next.js classroom E2E: one synthetic owner, one teacher,
 * one class, five independently signed fake-WeChat parents, real OpenPronounce.
 * Disposable PG18 with FORCE RLS. Never touches production or real identities.
 *
 * ACCENTLAB_MIGRATIONS_DIR=/path/to/AccentLab/migrations \
 * ACCENTLAB_E2E_CANARY=/path/to/synthetic.webm npx tsx scripts/test_classroom_native_full_e2e.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import {spawnSync} from "node:child_process";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"soc-classroom-e2e-"));
fs.chmodSync(root,0o700);
const data=path.join(root,"data"),socket=path.join(root,"sock"),users=path.join(root,"users"),recordings=path.join(root,"recordings");
for(const p of [socket,users,recordings])fs.mkdirSync(p,{mode:0o700});
process.env.SOCTHINK_USER_DATA_DIR=users;
process.env.SOCTHINK_CLASSROOM_RECORDINGS_DIR=recordings;
const migrationDir=process.env.ACCENTLAB_MIGRATIONS_DIR||"";
const canaryPath=process.env.ACCENTLAB_E2E_CANARY||"";
if(!migrationDir||!canaryPath||!fs.existsSync(canaryPath))throw Error("Provide isolated migration directory and existing synthetic WebM");
const PG="/usr/lib/postgresql/18/bin",L="/usr/bin/psql";
function run(bin:string,args:string[],opts:Record<string,unknown>={}):string{
 const out=spawnSync(bin,args,{encoding:"utf8",timeout:120000,...opts});
 if(out.status!==0)throw Error([bin,args.join(" "),out.stderr,out.stdout].join("\n").slice(0,14000));
 return String(out.stdout||"").trim();
}
async function freePort():Promise<number>{
 const s=net.createServer();
 await new Promise<void>(resolve=>s.listen(0,"127.0.0.1",resolve));
 const address=s.address();
 if(typeof address==="string"||!address)throw Error("No test TCP port");
 const port=address.port;
 await new Promise<void>((resolve,reject)=>s.close(err=>err?reject(err):resolve()));
 return port;
}
async function main(){
const port=await freePort();
let started=false,success=false;
let closePool:(()=>Promise<void>)|null=null;
try {
  run(PG+"/initdb",["-D",data,"--no-instructions","--auth-local=trust","--auth-host=reject","--locale=C"]);
  fs.writeFileSync(path.join(data,"pg_hba.conf"),[
    "# Disposable loopback-only synthetic test instance",
    "local all all trust",
    "host all all 127.0.0.1/32 scram-sha-256",
    "host all all ::1/128 reject"
  ].join("\n")+"\n");
  run(PG+"/pg_ctl",["-D",data,"-l",path.join(root,"pg.log"),"-o",
    "-c listen_addresses=127.0.0.1 -c unix_socket_directories="+socket+" -p "+port,"-w","start"]);
  started=true;
  const adminCmd=(query:string)=>run(L,["-X","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres","-c",query]);
  for(let version=1;version<=7;version++){
    const filename="000"+version+"_"+
      ["accent_lab_core","accent_classroom_homework","accent_teacher_expected_roster",
       "accent_parent_join_approval","accent_class_wall_public_alias",
       "accent_assignment_claimed_at","accent_teacher_approval"][version-1]+".sql";
    run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres","-f",path.join(migrationDir,filename)]);
  }
  run(L,["-X","-q","-v","ON_ERROR_STOP=1","-h",socket,"-p",String(port),"-d","postgres",
    "-f",path.resolve(process.cwd(),"ops/db/20261114_accent_teacher_admin_direct_grant.sql")]);
  const role="classroom_e2e_app";
  const password=crypto.randomBytes(18).toString("hex");
  adminCmd("CREATE ROLE "+role+" LOGIN PASSWORD '"+password+"' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
  adminCmd("GRANT USAGE ON SCHEMA accent TO "+role+"; GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA accent TO "+role+"; GRANT DELETE ON accent.class_expected_roster TO "+role);
  process.env.SOCTHINK_CLASSROOM_DATABASE_URL="postgresql://"+role+":"+password+"@127.0.0.1:"+port+"/postgres";
  const {NextRequest}=await import("next/server");
  const {GET,POST}=await import("../src/app/english/pronunciation/classroom-api/[...path]/route");
  const {createParentSessionToken,authenticateOrCreateWechatParent,PARENT_SESSION_COOKIE}=await import("../src/lib/parent-auth");
  const {bindSiteOwner}=await import("../src/lib/site-owner");
  const {learnerId,classroomPool}=await import("../src/lib/classroom-web-core");
  closePool=()=>classroomPool().end();
  const nonce=crypto.randomBytes(6).toString("hex");
  const owner=authenticateOrCreateWechatParent({wechatId:"test-owner-"+nonce,name:"虚拟管理员"});
  const teacher=authenticateOrCreateWechatParent({wechatId:"test-teacher-"+nonce,name:"虚拟王老师"});
  const students=Array.from({length:5},(_,i)=>authenticateOrCreateWechatParent({
    wechatId:"test-student-"+(i+1)+"-"+nonce,name:"虚拟家长"+(i+1)
  }));
  bindSiteOwner({parent:owner,email:"isolated-owner@example.test",adminId:"isolated-fixture-admin"});
  const people=[owner,teacher,...students];
  const cookies=new Map(people.map(p=>[p.id,PARENT_SESSION_COOKIE+"="+createParentSessionToken(p.id)]));
  const BASE="https://socthink.cn/english/pronunciation/classroom-api/";
  async function api(who:typeof people[number]|null,method:"GET"|"POST",segments:string[],body?:Record<string,unknown>|Uint8Array,extra:Record<string,string>={},search?:string){
    const headers:Record<string,string>={"host":"socthink.cn","accept":"application/json",...extra};
    if(who)headers.cookie=cookies.get(who.id)!;
    if(method==="POST")headers.origin="https://socthink.cn";
    let wire:BodyInit|undefined;
    if(body instanceof Uint8Array){
      headers["content-type"]="audio/webm";
      headers["x-request-id"]=crypto.randomUUID();
      wire=Buffer.from(body);
    }else if(body){
      headers["content-type"]="application/json";
      wire=JSON.stringify(body);
    }
    const req=new NextRequest(BASE+segments.join("/")+(search?"?q="+encodeURIComponent(search):""),{method,headers,body:wire});
    const response=method==="POST"?await POST(req,{params:Promise.resolve({path:segments})}):
      await GET(req,{params:Promise.resolve({path:segments})});
    let json:ReturnType<typeof JSON.parse>;
    if(response.headers.get("content-type")?.includes("application/json")){
      json=await response.json();
    }else json=await response.arrayBuffer();
    return {code:response.status,json};
  }
  function ok(result:Awaited<ReturnType<typeof api>>,code=200,label=""){
    if(result.code!==code)throw Error("FAIL "+label+": HTTP "+result.code+" "+JSON.stringify(result.json).slice(0,900));
    console.log("PASS",label,"HTTP",result.code);
    return result.json;
  }
  ok(await api(null,"GET",["health"]),200,"Native Web app healthy against disposable PG18");
  ok(await api(null,"GET",["me"]),401,"No cookie denied");
  const teacherAccount=learnerId(teacher.id);
  const before=ok(await api(teacher,"GET",["teacher","access"]),200,"Teacher starts as ordinary WeChat user");
  if(before.approved)throw Error("Teacher unexpectedly preapproved");
  const forbiddenSearch=await api(teacher,"GET",["admin","users"],undefined,{},"虚拟王");
  if(forbiddenSearch.code!==403)throw Error("Non-admin can search verified parent accounts");
  const candidates=ok(await api(owner,"GET",["admin","users"],undefined,{},"虚拟王"),200,
    "Owner searches verified WeChat users without an application");
  if(!candidates.users.some((x:{account_id:string})=>x.account_id===teacherAccount))
    throw Error("Teacher not found by admin WeChat lookup");
  const grant=ok(await api(owner,"POST",["admin","teachers","direct"],{
    account_id:teacherAccount,approve:true
  }),200,"Site owner directly grants teacher role without application");
  if(grant.status!=="approved")throw Error("Direct role not approved");
  const now=ok(await api(teacher,"GET",["teacher","access"]),200,"Teacher sees immediate approval");
  if(!now.approved)throw Error("Teacher approval not reflected in current session");
  const created=ok(await api(teacher,"POST",["teacher","onboard"],{class_name:"虚拟五人英语班"}),200,"Teacher creates one class");
  if(created.original_sentences!==9)throw Error("Expected nine original sentences");
  const tenant=created.tenant_id,cl=created.class_id;
  const base=["tenants",tenant,"classes",cl];
  const classes=ok(await api(teacher,"GET",["teacher","classes"]),200,"Teacher lists own class");
  if(classes.classes.length!==1)throw Error("Expected exactly one class");
  const catalog=ok(await api(teacher,"GET",[...base,"catalog"]),200,"Teacher sees nine sentences");
  if(catalog.items.length!==9)throw Error("Catalog must contain 9 sentences");
  // Guard against self-publishing, malformed uploads and duplicate material.
  const outsider=await api(students[0],"POST",[...base,"materials"],{
    title:"Malicious material",sentences:["Student must not create a teacher assignment."],
    rights_confirmed:true
  });
  if(outsider.code!==403)throw Error("Non-teacher was able to upload classroom materials");
  const invalidDuplicates=await api(teacher,"POST",[...base,"materials"],{
    title:"Duplicate sentences",sentences:[
      "The same sentence must not appear twice in one teacher upload.",
      "The same sentence must not appear twice in one teacher upload."
    ],rights_confirmed:true
  });
  if(invalidDuplicates.code!==400)throw Error("Duplicate teacher sentences were accepted");
  const tooMany=await api(teacher,"POST",[...base,"materials"],{
    title:"Too many sentences",sentences:Array.from({length:81},(_,i)=>
      "This teacher sentence is numbered "+i+" for a batch size boundary check."),
    rights_confirmed:true
  });
  if(tooMany.code!==400)throw Error("Above 80 sentence upload limit was accepted");
  console.log("PASS Material role permission and input boundaries");
  const customText="My teacher wants every student to read this exact sentence aloud.";
  const rejected=await api(teacher,"POST",[...base,"materials"],{
    title:"Chapter 3",sentences:[customText],rights_confirmed:false
  });
  if(rejected.code!==400)throw Error("Missing material rights confirmation accepted");
  const material=ok(await api(teacher,"POST",[...base,"materials"],{
    title:"Chapter 3 uploaded English text",sentences:[customText],rights_confirmed:true
  }),200,"Teacher imports their own exact sentence material");
  const updated=ok(await api(teacher,"GET",[...base,"catalog"]),200,"Teacher reads uploaded material in the same catalog");
  const first=updated.items.find((row:{sentence_set_id:string})=>row.sentence_set_id===material.set_id);
  if(!first||first.sentence!==customText)throw Error("Imported teacher sentence not returned exactly");
  const roster=students.map((_,i)=>"模拟学生"+(i+1));
  ok(await api(teacher,"POST",[...base,"expected-roster"],{names:roster}),200,"Teacher imports five student names");
  const assignment=ok(await api(teacher,"POST",[...base,"assignments"],{
    title:"虚拟课堂上传文本作业",sentence_set_id:material.set_id,sentence_ids:[first.id]
  }),200,"Teacher publishes uploaded teacher sentence via WeChat invitation");
  const link=String(assignment.share_url);
  const match=link.match(/\/a\/[0-9a-f-]{36}\/([0-9a-f]{64})$/i);
  if(!match||!link.startsWith("https://socthink.cn/"))throw Error("Invalid teacher share link");
  const share=match[1],assignmentId=assignment.assignment_id;
  const audio=new Uint8Array(fs.readFileSync(canaryPath));
  if(audio.length<1024||audio.length>2*1024*1024)throw Error("Canary outside 1KB..2MB");
  const originalFetch=globalThis.fetch;
  globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
    const src=String(input);
    // Test-only redirect to the already-live local OpenPronounce; never mock its scores.
    if(src==="http://127.0.0.1:18099/pronunciation")
      return originalFetch("http://127.0.0.1:8099/pronunciation",init);
    return originalFetch(input,init);
  }) as typeof fetch;
  const studentAttempts:string[]=[];
  for(let i=0;i<students.length;i++){
    const student=students[i];
    const name=roster[i];
    const join=ok(await api(student,"POST",["tenants",tenant,"a",share,"join"],{
      student_name:name,grade_label:"五年级"
    }),200,"Student "+(i+1)+" applies");
    if(join.status!=="pending")throw Error("Student unexpectedly auto-approved");
    const pending=ok(await api(teacher,"GET",[...base,"join-requests"]),200,"Teacher sees join request "+(i+1));
    const reqRow=pending.requests.find((x:{student_name:string})=>x.student_name===name);
    if(!reqRow)throw Error("Missing pending student "+(i+1));
    ok(await api(teacher,"POST",[...base,"join-requests",reqRow.id,"decision"],{
      approve:true,assigned_class_id:cl
    }),200,"Teacher approves student "+(i+1));
    const homework=ok(await api(student,"GET",["tenants",tenant,"a",share]),200,"Student "+(i+1)+" reads assignment");
    if(homework.items.length!==1||homework.items[0].sentence_id!==first.id||
       homework.items[0].sentence!==customText)
      throw Error("Student sees wrong text instead of the EXACT teacher-uploaded sentence");
    ok(await api(student,"POST",["tenants",tenant,"a",share,"claim"]),200,"Student "+(i+1)+" claims homework");
    const attempt=ok(await api(student,"POST",
      ["tenants",tenant,"a",share,"items",first.id,"attempts"],audio),200,
      "Student "+(i+1)+" gets REAL OpenPronounce score");
    if(typeof attempt.score!=="number"||attempt.score<0||attempt.score>100||!attempt.submitted)
      throw Error("Invalid model score or submission state");
    studentAttempts.push(attempt.attempt_id);
    const mine=ok(await api(student,"GET",["tenants",tenant,"assignments",assignmentId,"my-attempts"]),200,
      "Student "+(i+1)+" views own result");
    if(mine.attempt_count!==1||!mine.submitted)throw Error("Student own result not saved");
  }
  const report=ok(await api(teacher,"GET",["tenants",tenant,"assignments",assignmentId,"report"]),200,
    "Teacher obtains 5-student summary");
  if(report.total!==5||report.submitted!==5||report.students.length!==5)
    throw Error("Expected exactly 5/5 completed, got "+JSON.stringify(report).slice(0,1000));
  console.log("NATIVE_CLASSROOM_FIVE_STUDENT_REPORT_PASS total="+report.total+" completed="+report.submitted);
  const records=ok(await api(teacher,"GET",[...base,"assignments","list"]),200,
    "Teacher views permanent assignment history and statistics");
  if(records.assignments.length!==1||records.assignments[0].submitted!==5||
     records.assignments[0].enrolled_total!==5||
     typeof records.assignments[0].average_best_score!=="number")
    throw Error("Assignment history metrics missing or inconsistent");
  console.log("PASS Uploaded-material homework appears in historical metrics");
  const forbidden=await api(students[1],"GET",["tenants",tenant,"recordings",studentAttempts[0]]);
  if(forbidden.code!==403)throw Error("Other student may access private recording: "+forbidden.code);
  console.log("PASS Recording private across students");
  const ownAudio=await api(students[0],"GET",["tenants",tenant,"recordings",studentAttempts[0]]);
  if(ownAudio.code!==200)throw Error("Own private recording unavailable: "+ownAudio.code);
  console.log("PASS Student privately downloads own recording");
  ok(await api(teacher,"POST",["tenants",tenant,"assignments",assignmentId,"feedback"],{
    student_id:learnerId(students[0].id),attempt_id:studentAttempts[0],word_position:0,comment:"音量稳定，继续练习。"
  }),200,"Teacher writes feedback");
  const wall=ok(await api(students[0],"GET",["tenants",tenant,"a",share,"wall"]),200,"Student sees class wall");
  if(wall.submitted!==5)throw Error("Class wall must show five submissions");
  ok(await api(teacher,"POST",["tenants",tenant,"assignments",assignmentId,"close"]),200,
    "Teacher closes uploaded-material assignment");
  const closed=ok(await api(teacher,"GET",[...base,"assignments","list"]),200,
    "Closed historical homework remains in teacher history");
  if(closed.assignments[0]?.lifecycle!=="closed"||closed.assignments[0]?.submitted!==5)
    throw Error("Closed homework disappeared or statistics were lost");
  ok(await api(owner,"POST",["admin","teachers","direct"],{account_id:teacherAccount,approve:false}),200,
    "Owner revokes teacher");
  const denied=await api(teacher,"GET",["tenants",tenant,"assignments",assignmentId,"report"]);
  if(denied.code!==403)throw Error("Revoked teacher still sees report "+denied.code);
  console.log("PASS Revoked teacher cannot read student report");
  console.log("SOCTHINK_CLASSROOM_TEACHER_MATERIALS_HISTORY_E2E_PASS teacher=1 students=5 custom_sentence=true scored=5 history=true closed=true");
  success=true;
}finally {
  if(closePool){
    try{await closePool();console.log("ISOLATED_PG_POOL_CLOSED_PASS");}
    catch(err){success=false;console.error("ISOLATED_PG_POOL_CLOSE_FAIL",String(err));}
  }
  if(started){
    const stop=spawnSync(PG+"/pg_ctl",["-D",data,"-m","immediate","-w","stop"],
      {encoding:"utf8",timeout:20000});
    if(stop.status!==0)console.error("TEST_POSTGRES_STOP_ERROR",String(stop.stderr||"").slice(0,700));
  }
  fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  console.log("ISOLATED_TEST_STORAGE_CLEANED",success);
}
}
main().catch(err=>{console.error("CLASSROOM_NATIVE_E2E_FAIL",err instanceof Error?err.message:String(err));process.exitCode=1});
