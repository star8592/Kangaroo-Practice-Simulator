import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-owner-admin-bridge-"));
process.env.SOCTHINK_USER_DATA_DIR=root;
process.env.SOCTHINK_SOURCE_WATCH_DIR=path.join(root,"watch");

async function run(){
 // Load AFTER fixing the temp data root. No production accounts are touched.
 const auth=await import("../src/lib/auth");
 const parentAuth=await import("../src/lib/parent-auth");
 const siteOwner=await import("../src/lib/site-owner");
 const bridge=await import("../src/lib/platform-admin-principal");
 const students=await import("../src/app/api/admin/students/route");
 const watch=await import("../src/app/api/admin/competition-source-watch/route");
 const feedback=await import("../src/app/api/admin/feedback-cases/route");
 const admin=auth.createAdmin({username:"bridge_admin",name:"QA Admin",pin:"123456789"});
 const parent=parentAuth.authenticateOrCreateWechatParent({wechatId:"verified-owner-id"});
 const outsider=parentAuth.authenticateOrCreateWechatParent({wechatId:"verified-other-id"});
 const token=parentAuth.createParentSessionToken(parent.id);
 const outsiderToken=parentAuth.createParentSessionToken(outsider.id);
 const ownerCookie=parentAuth.PARENT_SESSION_COOKIE+"="+token;
 const otherCookie=parentAuth.PARENT_SESSION_COOKIE+"="+outsiderToken;
 const oldCookie=auth.SESSION_COOKIE+"="+auth.createSessionToken(admin.id);
 function req(route:string,cookie:string,method:"GET"|"POST"|"PATCH"="GET",body?:object,origin?:string){
  const headers:Record<string,string>={cookie};
  if(body)headers["content-type"]="application/json";
  if(origin)headers.origin=origin;
  return new NextRequest("http://localhost"+route,{
   method,headers,...(body?{body:JSON.stringify(body)}:{}),
  });
 }
 const principal=(cookie:string)=>bridge.platformAdminPrincipal(req("/api/admin/students",cookie).cookies);
 assert.equal(principal(""),null);
 assert.equal(principal(otherCookie),null);
 assert.equal(principal(ownerCookie),null,"Owner must be bound by verified legacy admin first");
 assert.deepEqual(principal(oldCookie),{source:"legacy-admin",actorId:admin.id});
 siteOwner.bindSiteOwner({parent,email:"owner@example.org",adminId:admin.id,verifiedAt:Date.now()});
 assert.deepEqual(principal(ownerCookie),{source:"wechat-site-owner",actorId:admin.id});
 assert.equal(principal(otherCookie),null,"Another WeChat account must not inherit owner role");
 assert.equal((await students.GET(req("/api/admin/students",otherCookie))).status,403);
 assert.equal((await students.GET(req("/api/admin/students",ownerCookie))).status,200);
 assert.equal((await students.GET(req("/api/admin/students",oldCookie))).status,200);
 assert.equal((await watch.GET(req("/api/admin/competition-source-watch",ownerCookie))).status,200);
 const payload={username:"we-owner-qa-student",candidateNo:"QA-11",name:"Isolated Child",
  grade:5,pin:"123456"};
 assert.equal((await students.POST(req("/api/admin/students",ownerCookie,"POST",payload))).status,403,
  "A privileged WeChat cookie cannot make a cross-origin or originless mutation");
 assert.equal((await students.POST(req("/api/admin/students",ownerCookie,"POST",payload,"https://evil.test"))).status,403);
 const created=await students.POST(req("/api/admin/students",ownerCookie,"POST",payload,"http://localhost"));
 assert.equal(created.status,201,JSON.stringify(await created.clone().json()));
 const newStudent=(await created.json()).user;
 const patched=await students.PATCH(req("/api/admin/students",ownerCookie,"PATCH",
  {id:newStudent.id,grade:6},"http://localhost"));
 assert.equal(patched.status,200);
 assert.equal((await patched.json()).user.grade,6);
 const invalidFeedback={feedbackId:"0".repeat(32),expectedVersion:0,
  to:"investigating",note:"Verified admin reviewed the evidence"};
 assert.equal((await feedback.PATCH(req("/api/admin/feedback-cases",otherCookie,"PATCH",
  invalidFeedback,"http://localhost"))).status,403);
 const ownerResult=await feedback.PATCH(req("/api/admin/feedback-cases",ownerCookie,"PATCH",
  invalidFeedback,"http://localhost"));
 assert.notEqual(ownerResult.status,403,"The real owner principal must reach the guarded handler");
 assert.ok([404,409].includes(ownerResult.status));
 console.log("WECHAT_OWNER_ADMIN_BRIDGE=PASS legacy+owner+outsider+same-origin+student-mutation+audit-actor");
}
run().catch(e=>{console.error(e);process.exitCode=1})
 .finally(()=>fs.rmSync(root,{recursive:true,force:true}));
