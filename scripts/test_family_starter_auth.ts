import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-family-starter-"));
 const before=process.env.SOCTHINK_USER_DATA_DIR;
 process.env.SOCTHINK_USER_DATA_DIR=root;
 try{
  const auth=await import("../src/lib/auth");
  const parents=await import("../src/lib/parent-auth");
  const access=await import("../src/lib/exam-access");
  const {GET}=await import("../src/app/api/auth/guest/start/route");
  const p=parents.createParent({email:"test-family@example.test",name:"微信家庭",passwordHash:parents.hashPassword("StrongFamilyPass9"),termsAcceptedAt:Date.now(),guardianConfirmedAt:Date.now()});
  const parentToken=parents.createParentSessionToken(p.id);
  const target="https://socthink.cn/api/auth/guest/start?next=%2Farithmetic";
  const first=await GET(new NextRequest(target,{headers:{cookie:parents.PARENT_SESSION_COOKIE+"="+parentToken}}));
  assert.equal(first.status,307);
  assert.equal(first.headers.get("location"),"/arithmetic");
  const cookie=first.cookies.get(auth.SESSION_COOKIE);
  assert.ok(cookie?.value);
  assert.equal(cookie?.maxAge,30*24*60*60);
  assert.equal(cookie?.httpOnly,true);
  const practice=auth.userFromSessionToken(cookie!.value);
  assert.ok(practice?.id.startsWith("guest_family_"));
  assert.equal(practice?.candidateNo,"GUEST");
  assert.equal(access.hasFullExamAccess(practice),true,"verified WeChat family has same free-exam rights as registered student");
  assert.equal(practice?.name,"家庭体验档案");
  const second=await GET(new NextRequest(target,{headers:{cookie:parents.PARENT_SESSION_COOKIE+"="+parentToken}}));
  assert.equal(auth.userFromSessionToken(second.cookies.get(auth.SESSION_COOKIE)?.value)?.id,practice?.id);
  const existing=await GET(new NextRequest(target,{headers:{cookie:parents.PARENT_SESSION_COOKIE+"="+parentToken+"; "+auth.SESSION_COOKIE+"="+cookie?.value}}));
  assert.equal(existing.cookies.get(auth.SESSION_COOKIE),undefined,"must not displace an in-progress learner");
  const permitted=await GET(new NextRequest("https://socthink.cn/api/auth/guest/start?next=/exam/maa-amc12-practice-geometry",{headers:{cookie:parents.PARENT_SESSION_COOKIE+"="+parentToken}}));
  assert.equal(permitted.headers.get("location"),"/exam/maa-amc12-practice-geometry");
  assert.ok(auth.userFromSessionToken(permitted.cookies.get(auth.SESSION_COOKIE)?.value)?.id.startsWith("guest_family_"));
  const denied=await GET(new NextRequest("https://socthink.cn/api/auth/guest/start?next=/exam/test"));
  assert.equal(denied.headers.get("location"),"/login?next=%2Fexam%2Ftest");
  assert.equal(denied.cookies.get(auth.SESSION_COOKIE),undefined);
  const anonymous=await GET(new NextRequest(target));
  assert.ok(auth.userFromSessionToken(anonymous.cookies.get(auth.SESSION_COOKIE)?.value)?.id.startsWith("guest_"));
  assert.equal(auth.userFromSessionToken(anonymous.cookies.get(auth.SESSION_COOKIE)?.value)?.id.startsWith("guest_family_"),false);
  const {POST:logout}=await import("../src/app/api/auth/parent/logout/route");
  const loggedOut=await logout(new NextRequest("https://socthink.cn/api/auth/parent/logout",{headers:{cookie:parents.PARENT_SESSION_COOKIE+"="+parentToken+"; "+auth.SESSION_COOKIE+"="+cookie?.value}}));
  assert.equal(loggedOut.cookies.get(auth.SESSION_COOKIE)?.maxAge,0,"family practice must clear on logout");
  const student=auth.createStudent({username:"test_child_logout",candidateNo:"test_child_logout",name:"Test Child",grade:1,pin:"1234"});
  const childSession=auth.createSessionToken(student.id);
  const adultOnlyLogout=await logout(new NextRequest("https://socthink.cn/api/auth/parent/logout",{headers:{cookie:parents.PARENT_SESSION_COOKIE+"="+parentToken+"; "+auth.SESSION_COOKIE+"="+childSession}}));
  assert.equal(adultOnlyLogout.cookies.get(auth.SESSION_COOKIE),undefined,"independent child account must be preserved");
  parents.resetParentPassword("test-family@example.test","ChangedFamilyPass9");
  assert.equal(auth.userFromSessionToken(cookie?.value),null,"revoked parent must revoke family practice session");
  console.log("FAMILY_STARTER_AUTH=PASS stable_id=true anonymous_exam_denied=true family_full_exam_allowed=true old_session_preserved=true parent_revocation=true");
 }finally{
  if(before===undefined)delete process.env.SOCTHINK_USER_DATA_DIR;else process.env.SOCTHINK_USER_DATA_DIR=before;
  fs.rmSync(root,{recursive:true,force:true});
 }
}
main().catch(err=>{console.error(err);process.exitCode=1});
