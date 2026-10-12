import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-family-learner-"));
 const saved=process.env.SOCTHINK_USER_DATA_DIR;
 process.env.SOCTHINK_USER_DATA_DIR=dir;
 try{
  const auth=await import("../src/lib/auth");
  const parents=await import("../src/lib/parent-auth");
  const family=await import("../src/lib/family-store");
  const route=await import("../src/app/api/family/learner/route");
  const bind=await import("../src/app/api/family/students/bind/route");
  const studentsRoute=await import("../src/app/api/family/students/route");
  const exam=await import("../src/lib/exam-access");

  const adultA=parents.createParent({email:"family-a@example.test",name:"家庭A",passwordHash:parents.hashPassword("ParentTestA111"),termsAcceptedAt:Date.now(),guardianConfirmedAt:Date.now()});
  const adultB=parents.createParent({email:"family-b@example.test",name:"家庭B",passwordHash:parents.hashPassword("ParentTestB111"),termsAcceptedAt:Date.now(),guardianConfirmedAt:Date.now()});
  const a=auth.createStudent({username:"learner_a",candidateNo:"L-A",name:"小甲",grade:2,pin:"123456"});
  const b=auth.createStudent({username:"learner_b",candidateNo:"L-B",name:"小乙",grade:4,pin:"654321"});
  const outsider=auth.createStudent({username:"learner_external",candidateNo:"L-C",name:"其他孩子",grade:6,pin:"147258"});
  const old=auth.createStudent({username:"learner_old",candidateNo:"L-D",name:"已有成绩的孩子",grade:3,pin:"963852"});
  family.addStudentToFamily(adultA.id,a.id);
  family.addStudentToFamily(adultA.id,b.id);
  family.addStudentToFamily(adultB.id,outsider.id);
  assert.throws(()=>family.addStudentToFamily(adultB.id,a.id),/绑定其他家庭/);
  const cA=parents.PARENT_SESSION_COOKIE+"="+parents.createParentSessionToken(adultA.id);
  const cB=parents.PARENT_SESSION_COOKIE+"="+parents.createParentSessionToken(adultB.id);
  const url="https://socthink.cn/api/family/learner";
  const request=(cookies:string,body:unknown,origin="https://socthink.cn")=>
   new NextRequest(url,{method:"POST",headers:{"content-type":"application/json","origin":origin,"cookie":cookies},body:JSON.stringify(body)});
  const noAuth=await route.POST(request("",{studentId:a.id}));
  assert.equal(noAuth.status,401);
  const forged=await route.POST(request(cA,{studentId:outsider.id}));
  assert.equal(forged.status,403);
  assert.equal(forged.cookies.get(auth.SESSION_COOKIE),undefined);
  assert.equal((await route.POST(request(cA,{studentId:a.id},"https://attacker.invalid"))).status,403);
  const current=await route.GET(new NextRequest(url,{headers:{cookie:cA}}));
  assert.equal((await current.json()).activeStudentId,null);
  const first=await route.POST(request(cA,{studentId:a.id}));
  assert.equal(first.status,200);
  const emittedCookies=first.headers.getSetCookie();
  assert.ok(emittedCookies.some(x=>x.includes("Max-Age=0")&&!x.includes("domain=")),"legacy host-only cookie must be cleared");
  assert.ok(emittedCookies.some(x=>x.toLowerCase().includes("domain=socthink.cn")||x.toLowerCase().includes("domain=.socthink.cn")),"the new learner cookie must be shared across the site");
  const canonical=emittedCookies.find(x=>x.includes("Max-Age=604800")&&x.toLowerCase().includes("domain=.socthink.cn"));
  const domainToken=decodeURIComponent(canonical?.split(";")[0].split("=").slice(1).join("=")||"");
  assert.ok(domainToken,"domain session cookie must be present");
  assert.equal(auth.userFromSessionToken(domainToken)?.id,a.id);
  const cookieA={value:domainToken};
  const active=await route.GET(new NextRequest(url,{headers:{cookie:cA+"; "+auth.SESSION_COOKIE+"="+cookieA?.value}}));
  assert.equal((await active.json()).activeStudentId,a.id);

  const second=await route.POST(request(cA,{studentId:b.id}));
  assert.equal(second.status,200);
  const secondCanonical=second.headers.getSetCookie().find(x=>x.includes("Max-Age=604800")&&x.toLowerCase().includes("domain=.socthink.cn"));
  assert.equal(auth.userFromSessionToken(decodeURIComponent(secondCanonical?.split(";")[0].split("=").slice(1).join("=")||""))?.id,b.id);
  assert.equal(auth.userFromSessionToken(cookieA?.value)?.id,a.id,"switch must not revoke another device's student record");
  const back=await route.POST(request(cA,{studentId:null}));
  assert.equal(back.status,200);
  const familyCanonical=back.headers.getSetCookie().find(x=>x.includes("Max-Age=604800")&&x.toLowerCase().includes("domain=.socthink.cn"));
  const familyToken=decodeURIComponent(familyCanonical?.split(";")[0].split("=").slice(1).join("=")||"");
  const familyUser=auth.userFromSessionToken(familyToken);
  assert.ok(familyUser?.id.startsWith("guest_family_"));
  assert.equal(exam.hasFullExamAccess(familyUser),false);

  const linkUrl="https://socthink.cn/api/family/students/bind";
  const requestBind=(cookie:string,username:string,pin:string)=>new NextRequest(linkUrl,{
   method:"POST",headers:{"content-type":"application/json","origin":"https://socthink.cn","cookie":cookie},
   body:JSON.stringify({username,pin}),
  });
  assert.equal((await bind.POST(requestBind(cA,old.username,"000000"))).status,401);
  const linked=await bind.POST(requestBind(cA,old.username,"963852"));
  assert.equal(linked.status,200);
  assert.equal((await linked.json()).student.id,old.id);
  assert.equal(family.familyOwnsStudent(adultA.id,old.id),true);
  assert.equal((await bind.POST(requestBind(cA,old.username,"963852"))).status,200,"linking twice is idempotent");
  assert.equal((await bind.POST(requestBind(cB,old.username,"963852"))).status,409,"other family must not steal learner");

  const createResponse=await studentsRoute.POST(new NextRequest("https://socthink.cn/api/family/students",{
   method:"POST",headers:{"content-type":"application/json","origin":"https://socthink.cn","cookie":cA},
   body:JSON.stringify({name:"新孩子",grade:2}),
  }));
  assert.equal(createResponse.status,201);
  const newStudent=(await createResponse.json()).student;
  assert.equal(newStudent.name,"新孩子");
  assert.equal(newStudent.pinHash,undefined);
  assert.equal(family.familyOwnsStudent(adultA.id,newStudent.id),true);
  assert.equal((await route.POST(request(cA,{studentId:newStudent.id}))).status,200);

  parents.resetParentPassword("family-a@example.test","ChangedTestA123");
  assert.equal(auth.userFromSessionToken(familyToken),null);
  console.log("FAMILY_LEARNER_SWITCH=PASS siblings_isolated=true guest_downgrade=true cross_family_denied=true existing_pin_binding=true easy_onboarding=true revoked=true");
 }finally{
  if(saved===undefined)delete process.env.SOCTHINK_USER_DATA_DIR;
  else process.env.SOCTHINK_USER_DATA_DIR=saved;
  fs.rmSync(dir,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
