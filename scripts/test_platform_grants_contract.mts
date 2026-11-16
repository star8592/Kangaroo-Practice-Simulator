import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const privateData=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-platform-grants-"));
process.env.SOCTHINK_USER_DATA_DIR=privateData;
process.env.SOCTHINK_ENGLISH_SSO_KEY_VOCABULARY="isolated-test-secret-1234567890-abcdefghijklmnopqrstuvwxyz";

const {platformCapability,PLATFORM_CAPABILITIES}=await import("../src/lib/platform-capabilities");
const {validatedGrantChange,PlatformAuthError,activePlatformGrants,
  myAuthorizedModules}=await import("../src/lib/platform-grants");
const {authenticateOrCreateWechatParent,createParentSessionToken}=await import("../src/lib/parent-auth");
const {bindSiteOwner}=await import("../src/lib/site-owner");
const {NextRequest}=await import("next/server");
const {GET:workspace}=await import("../src/app/api/platform/workspace/route");
const {GET:accounts}=await import("../src/app/api/platform/admin/accounts/route");
const {GET:readGrants,POST:changeGrant}=await import("../src/app/api/platform/admin/grants/route");
const {POST:verifyBackend}=await import("../src/app/api/platform/authorization/verify/route");
const {PARENT_SESSION_COOKIE}=await import("../src/lib/parent-auth");

try{
 assert.deepEqual(PLATFORM_CAPABILITIES.filter(x=>x.implemented).map(x=>x.id),
  ["english.pronunciation","english.vocabulary"]);
 assert.equal(platformCapability("math.competition")?.implemented,false);
 const subject="par_"+"a".repeat(18);
 const valid={subject,capability:"english.pronunciation",role:"teacher",
  scopeKind:"product",scopeId:"",action:"grant"};
 assert.equal(validatedGrantChange(valid).capability,"english.pronunciation");
 for(const bad of [
  {...valid,capability:"math.competition"},
  {...valid,capability:"english.aelos"},
  {...valid,capability:"english.pronunciation.fake"},
  {...valid,role:"owner"},
  {...valid,scopeKind:"organization",scopeId:"11111111-1111-4111-8111-111111111111"},
  {...valid,subject:"par_weak"},
  {...valid,action:"promote"},
 ]){
  assert.throws(()=>validatedGrantChange(bad),PlatformAuthError);
 }
 console.log("PLATFORM_CAPABILITY_DENY_BY_DEFAULT_CONTRACT_PASS");
 if(!process.env.SOCTHINK_PLATFORM_DATABASE_URL){
  console.log("PLATFORM_TEST_DATABASE_NOT_PROVIDED; DB integration skipped");
 }else{
 const owner=authenticateOrCreateWechatParent({
  wechatId:"owner-union-verification-0001",unionId:"owner-union-verification-0001",
  openId:"owner-web-openid-01",oauthMode:"website",name:"模拟平台管理员",
 });
 const teacher=authenticateOrCreateWechatParent({
  wechatId:"teacher-union-verification-0002",unionId:"teacher-union-verification-0002",
  openId:"teacher-web-openid-02",oauthMode:"website",name:"模拟测试教师",
 });
 bindSiteOwner({parent:owner,email:"admin@example.org",adminId:"isolated-owner"});
 function cookie(u:typeof owner){return PARENT_SESSION_COOKIE+"="+createParentSessionToken(u.id)}
 function req(url:string,u:typeof owner,options?:{method?:string;origin?:string;body?:object;key?:string}){
  return new NextRequest("https://socthink.cn"+url,{
   method:options?.method||"GET",
   headers:{
    cookie:cookie(u),
    ...(options?.origin?{origin:options.origin}:{}),
    ...(options?.body?{"content-type":"application/json"}:{}),
    ...(options?.key?{authorization:"Bearer "+options.key}:{}),
   },
   body:options?.body?JSON.stringify(options.body):undefined,
  });
 }
 const before=await workspace(req("/api/platform/workspace",teacher));
 assert.equal(before.status,200);
 assert.deepEqual((await before.json()).modules,[]);
 const notOwner=await accounts(req("/api/platform/admin/accounts?q=模拟",teacher));
 assert.equal(notOwner.status,403);
 const ownerFind=await accounts(req("/api/platform/admin/accounts?q=模拟",owner));
 assert.equal(ownerFind.status,200);
 const found=(await ownerFind.json()).users as Array<{subject:string}>;
 assert(found.some(x=>x.subject===teacher.id));
 const body={...valid,subject:teacher.id};
 const wrongOrigin=await changeGrant(req("/api/platform/admin/grants",owner,{
  method:"POST",origin:"https://example.invalid",body}));
 assert.equal(wrongOrigin.status,403);
 const nonOwnerWrite=await changeGrant(req("/api/platform/admin/grants",teacher,{
  method:"POST",origin:"https://socthink.cn",body}));
 assert.equal(nonOwnerWrite.status,403);
 const write=await changeGrant(req("/api/platform/admin/grants",owner,{
  method:"POST",origin:"https://socthink.cn",body}));
 assert.equal(write.status,200,await write.text());
 const after=await workspace(req("/api/platform/workspace",teacher));
 const modules=(await after.json()).modules as Array<{id:string}>;
 assert.deepEqual(modules.map(x=>x.id),["english.pronunciation"]);
 const duplicate=await changeGrant(req("/api/platform/admin/grants",owner,{
  method:"POST",origin:"https://socthink.cn",body}));
 assert.equal((await duplicate.json()).changed,false);
 const read=await readGrants(req("/api/platform/admin/grants?subject="+teacher.id,owner));
 assert.equal((await read.json()).grants.length,1);
 assert.equal((await activePlatformGrants(teacher.id)).length,1);
 const key=process.env.SOCTHINK_ENGLISH_SSO_KEY_VOCABULARY;
 const backendBefore=await verifyBackend(req("/api/platform/authorization/verify",teacher,{
  method:"POST",body:{product:"vocabulary"},key}));
 assert.equal(backendBefore.status,200);
 assert.equal((await backendBefore.json()).authorized,false);
 const vocabGrant=await changeGrant(req("/api/platform/admin/grants",owner,{
  method:"POST",origin:"https://socthink.cn",body:{...body,capability:"english.vocabulary"}}));
 assert.equal(vocabGrant.status,200);
 const backendAfter=await verifyBackend(req("/api/platform/authorization/verify",teacher,{
  method:"POST",body:{product:"vocabulary"},key}));
 assert.equal(backendAfter.status,200);
 const positive=await backendAfter.json();
 assert.equal(positive.authorized,true);
 assert.equal(positive.product,"vocabulary");
 assert.match(positive.subject,/^soc_[a-f0-9]{40}$/);
 const noKey=await verifyBackend(req("/api/platform/authorization/verify",teacher,{
  method:"POST",body:{product:"vocabulary"}}));
 assert.equal(noKey.status,401);
 const revoked=await changeGrant(req("/api/platform/admin/grants",owner,{
  method:"POST",origin:"https://socthink.cn",body:{...body,capability:"english.vocabulary",action:"revoke"}}));
 assert.equal(revoked.status,200);
 const backendRevoked=await verifyBackend(req("/api/platform/authorization/verify",teacher,{
  method:"POST",body:{product:"vocabulary"},key}));
 assert.equal((await backendRevoked.json()).authorized,false);
 const revAcc=await changeGrant(req("/api/platform/admin/grants",owner,{
  method:"POST",origin:"https://socthink.cn",body:{...body,action:"revoke"}}));
 assert.equal(revAcc.status,200);
 assert.deepEqual(await myAuthorizedModules(teacher.id),[]);
 const {platformPool}=await import("../src/lib/platform-grants");
 const audit=await platformPool().query<{n:string}>(
  "SELECT count(*)::text AS n FROM platform.role_grant_audit WHERE actor=$1",[owner.id]);
 assert.equal(Number(audit.rows[0].n),4,"Grant, grant, revoke, revoke; no duplicate audit");
 console.log("PLATFORM_PG_ROLE_GRANT_REVOKE_AUDIT_AND_BACKEND_VERIFY_PASS");
 await platformPool().end();
 }
}finally{
 fs.rmSync(privateData,{recursive:true,force:true});
}
