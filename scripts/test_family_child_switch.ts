import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"kps-verified-child-switch-"));
 const before=process.env.SOCTHINK_USER_DATA_DIR;
 process.env.SOCTHINK_USER_DATA_DIR=dir;
 try{
  const a=await import("../src/lib/auth");
  const p=await import("../src/lib/parent-auth");
  const f=await import("../src/lib/family-store");
  const {POST}=await import("../src/app/api/family/active-student/route");
  const {POST:logout}=await import("../src/app/api/auth/parent/logout/route");
  const parentA=p.authenticateOrCreateWechatParent({wechatId:"test-p1",openId:"op1"});
  const parentB=p.authenticateOrCreateWechatParent({wechatId:"test-p2",openId:"op2"});
  const childA=a.createStudent({username:"child_switch_a",candidateNo:"FAM-A",name:"孩子甲",grade:2,pin:"112233"});
  const childB=a.createStudent({username:"child_switch_b",candidateNo:"FAM-B",name:"孩子乙",grade:4,pin:"445566"});
  f.addStudentToFamily(parentA.id,childA.id);f.addStudentToFamily(parentA.id,childB.id);
  const token=p.createParentSessionToken(parentA.id);
  function req(opts:{parentToken?:string;origin?:string;studentId?:string}={}){
   const h:Record<string,string>={"content-type":"application/json","host":"socthink.cn"};
   if(opts.origin!==undefined)h.origin=opts.origin;
   if(opts.parentToken)h.cookie=p.PARENT_SESSION_COOKIE+"="+opts.parentToken;
   return new NextRequest("https://socthink.cn/api/family/active-student",{
    method:"POST",headers:h,body:JSON.stringify({studentId:opts.studentId||childA.id}),
   });
  }
  assert.equal((await POST(req({origin:"https://evil.example",parentToken:token}))).status,403,"cross-origin POST forbidden");
  assert.equal((await POST(req({parentToken:token}))).status,403,"missing Origin forbidden");
  assert.equal((await POST(req({origin:"https://socthink.cn"}))).status,401,"must have signed household");
  assert.equal((await POST(req({origin:"https://socthink.cn",parentToken:p.createParentSessionToken(parentB.id)}))).status,403);
  assert.equal((await POST(req({origin:"https://socthink.cn",parentToken:token,studentId:"stu_unauthorized"}))).status,403);
  const ra=await POST(req({origin:"https://socthink.cn",parentToken:token}));
  assert.equal(ra.status,200);
  assert.equal(ra.headers.get("cache-control"),"no-store");
  const selectedA=ra.cookies.get(a.SESSION_COOKIE);
  assert.equal(selectedA?.httpOnly,true);
  assert.equal(selectedA?.sameSite,"strict");
  assert.equal(a.userFromSessionToken(selectedA?.value)?.id,childA.id);
  const {hasFullExamAccess}=await import("../src/lib/exam-access");
  assert.equal(hasFullExamAccess(a.userFromSessionToken(selectedA?.value)),true,"selected verified student can use authorized exams");
  assert.equal(a.isFamilyManagedSessionToken(selectedA?.value),true);
  const rb=await POST(req({origin:"https://socthink.cn",parentToken:token,studentId:childB.id}));
  assert.equal(a.userFromSessionToken(rb.cookies.get(a.SESSION_COOKIE)?.value)?.id,childB.id,"switch isolates learner identity");
  const normal=a.createSessionToken(childA.id);
  const out=await logout(new NextRequest("https://socthink.cn/api/auth/parent/logout",{
    headers:{cookie:p.PARENT_SESSION_COOKIE+"="+token+"; "+a.SESSION_COOKIE+"="+selectedA?.value},
  }));
  assert.equal(out.cookies.get(a.SESSION_COOKIE)?.maxAge,0,"parent logout clears selected session");
  const normalOut=await logout(new NextRequest("https://socthink.cn/api/auth/parent/logout",{
    headers:{cookie:p.PARENT_SESSION_COOKIE+"="+token+"; "+a.SESSION_COOKIE+"="+normal},
  }));
  assert.equal(normalOut.cookies.get(a.SESSION_COOKIE),undefined,"independent student PIN login survives parent logout");
  a.updateStudent(childA.id,{pin:"998877"});
  assert.equal(a.userFromSessionToken(selectedA?.value),null,"revoke child PIN revokes selected session");
  assert.equal(a.userFromSessionToken(normal),null,"original child session revoked on PIN rotation");
  assert.equal(a.userFromSessionToken(rb.cookies.get(a.SESSION_COOKIE)?.value)?.id,childB.id);
  a.updateStudent(childB.id,{active:false});
  assert.equal(a.userFromSessionToken(rb.cookies.get(a.SESSION_COOKIE)?.value),null,"disabled child can no longer use delegated login");
  assert.equal((await POST(req({origin:"https://socthink.cn",parentToken:token,studentId:childB.id}))).status,403,"disabled child cannot be selected");
  const parentsFile=path.join(dir,"parents.json");
  const parents=JSON.parse(fs.readFileSync(parentsFile,"utf8"));
  const familyParent=parents.find((v:{id:string})=>v.id===parentA.id);
  familyParent.sessionVersion+=1;
  fs.writeFileSync(parentsFile,JSON.stringify(parents));
  assert.equal(a.userFromSessionToken(rb.cookies.get(a.SESSION_COOKIE)?.value),null,"family revocation revokes delegated child");
  const forged= a.userFromSessionToken(selectedA?.value);
  assert.equal(forged,null,"familyChild flag must never fall through as ordinary student token");
  console.log("FAMILY_CHILD_SWITCH=PASS separate_children=true origin_guard=true full_learner_identity=true guardian_revoke=true child_revoke=true");
 }finally{
  if(before===undefined)delete process.env.SOCTHINK_USER_DATA_DIR;else process.env.SOCTHINK_USER_DATA_DIR=before;
  fs.rmSync(dir,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
