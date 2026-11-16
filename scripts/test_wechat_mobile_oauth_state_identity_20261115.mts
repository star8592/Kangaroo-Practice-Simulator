import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-wechat-oauth-"));
process.env.SOCTHINK_USER_DATA_DIR=dir;
process.env.WECHAT_OPEN_APPID="wx"+ "1".repeat(16);
process.env.WECHAT_OPEN_SECRET="isolated-oa-test-secret";
process.env.WECHAT_WEBSITE_APPID="wx"+ "2".repeat(16);
process.env.WECHAT_WEBSITE_SECRET="isolated-website-test-secret";
process.env.WECHAT_LOGIN_MODE="website";
process.env.WECHAT_CALLBACK_ORIGIN="https://socthink.cn";
const originalFetch=globalThis.fetch;
try {
 const {WECHAT_MOBILE_FLOW_COOKIE:NAME,issueWechatMobileFlow,validateWechatMobileFlow}=await import("../src/lib/wechat-mobile-oauth-state");
 const {GET:start}=await import("../src/app/api/auth/parent/wechat/start/route");
 const {GET:callback}=await import("../src/app/api/auth/parent/wechat/callback/route");
 const {authenticateOrCreateWechatParent}=await import("../src/lib/parent-auth");
 const a=issueWechatMobileFlow(undefined,"/english/pronunciation/app/teacher/homework",1000);
 const b=issueWechatMobileFlow(a.cookie,"/english/pronunciation/app/a/t/h",2000);
 assert.equal(validateWechatMobileFlow(b.cookie,a.state,4000)?.next,
   "/english/pronunciation/app/teacher/homework");
 assert.equal(validateWechatMobileFlow(b.cookie,b.state,4000)?.next,
   "/english/pronunciation/app/a/t/h");
 assert.equal(validateWechatMobileFlow(b.cookie.replace(/.$/,"x"),a.state,4000),null);
 assert.equal(validateWechatMobileFlow(b.cookie,a.state,602000),null);
 console.log("SIGNED_MULTI_TAB_STATE_HMAC_TTL_PASS");
 // Use real route modules, isolated filesystem, mocked upstream response only.
 const req1=new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/start?next="+
  encodeURIComponent("/english/pronunciation/app/teacher/homework"));
 const started1=await start(req1);
 const oa1=new URL(started1.headers.get("location")||"");
 assert.equal(oa1.pathname,"/connect/oauth2/authorize");
 assert.equal(oa1.searchParams.get("scope"),"snsapi_userinfo", "Teacher first login must request verified cross-app identity");
 assert.equal(oa1.searchParams.get("appid"),process.env.WECHAT_OPEN_APPID);
 const state1=oa1.searchParams.get("state")||"";
 const cookie1=started1.cookies.get(NAME)?.value||"";
 assert(state1&&cookie1);
 const req2=new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/start?next="+
  encodeURIComponent("/english/pronunciation/app/a/teacher-assignment/abc"),
  {headers:{cookie:NAME+"="+cookie1}});
 const started2=await start(req2);
 const oa2=new URL(started2.headers.get("location")||"");
 assert.equal(oa2.searchParams.get("scope"),"snsapi_base", "Student/general login remains silent");
 const state2=oa2.searchParams.get("state")||"";
 const cookie2=started2.cookies.get(NAME)?.value||"";
 assert.notEqual(state1,state2);
 assert.equal(validateWechatMobileFlow(cookie2,state1)?.next,
   "/english/pronunciation/app/teacher/homework");
 assert.equal(validateWechatMobileFlow(cookie2,state2)?.next,
   "/english/pronunciation/app/a/teacher-assignment/abc");
 const optIn=await start(new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/start?profile=1&next=%2Faccount"));
 const optInUrl=new URL(optIn.headers.get("location")||"");
 assert.equal(optInUrl.searchParams.get("scope"),"snsapi_userinfo");
 assert.equal(optInUrl.searchParams.get("appid"),process.env.WECHAT_OPEN_APPID);
 assert(optIn.cookies.get(NAME)?.value);
 const redirect1=decodeURIComponent(oa1.searchParams.get("redirect_uri")||"");
 assert.equal(redirect1,"https://socthink.cn/api/auth/parent/wechat/callback");
 let profileCalls=0;
 globalThis.fetch=async(input:RequestInfo|URL)=>{
   const uri=String(input);
   if(uri.startsWith("https://api.weixin.qq.com/sns/userinfo")){
     profileCalls++;
     assert.equal(new URL(uri).searchParams.get("openid"),"oa-verified-openid-001");
     return new Response(JSON.stringify({
       openid:"oa-verified-openid-001", unionid:"union-same-user-001",
       nickname:"微信测试教师",
     }),{status:200,headers:{"content-type":"application/json"}});
   }
   assert(uri.startsWith("https://api.weixin.qq.com/sns/oauth2/access_token"),
     "Unexpected provider request");
   const params=new URL(uri).searchParams;
   assert.equal(params.get("appid"),process.env.WECHAT_OPEN_APPID,
     "Used website AppID for official-account mobile login");
   const isTeacher=params.get("code")==="mock-1";
   return new Response(JSON.stringify({
     access_token:"isolated-oa-access-token",
     openid:"oa-verified-openid-001",
     ...(isTeacher?{}:{unionid:"union-same-user-001"}),
     scope:isTeacher?"snsapi_userinfo":"snsapi_base",
   }),{status:200,headers:{"content-type":"application/json"}});
 };
 const cb1=new NextRequest("https://socthink.cn/api/auth/parent/wechat/callback?code=mock-1&state="+state1,
  {headers:{cookie:NAME+"="+cookie2}});
 const out1=await callback(cb1);
 assert.equal(out1.status,307);
 assert.equal(out1.headers.get("location"),"https://socthink.cn/english/pronunciation/app/teacher/homework");
 assert(out1.cookies.get("socthink_parent_session")?.value);
 assert.equal(profileCalls,1,"Teacher UnionID must come from official WeChat profile API");
 const remaining=out1.cookies.get(NAME)?.value||"";
 assert.equal(validateWechatMobileFlow(remaining,state1),null);
 assert.equal(validateWechatMobileFlow(remaining,state2)?.next,
   "/english/pronunciation/app/a/teacher-assignment/abc");
 console.log("OFFICIAL_ACCOUNT_FORCED_APPID_AND_TWO_JOURNEYS_PASS");
 console.log("TEACHER_FIRST_LOGIN_USERINFO_AND_SILENT_STUDENT_SCOPE_PASS");
 const cb2=new NextRequest("https://socthink.cn/api/auth/parent/wechat/callback?code=mock-2&state="+state2,
  {headers:{cookie:NAME+"="+remaining}});
 const out2=await callback(cb2);
 assert.equal(out2.headers.get("location"),
  "https://socthink.cn/english/pronunciation/app/a/teacher-assignment/abc");
 assert.equal(profileCalls,1,"Silent student login must not request profile info");
 const invalid=new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/callback?code=bad&state="+state1,
  {headers:{cookie:NAME+"="+cookie2.replace(/.$/,"x")}});
 const badOut=await callback(invalid);
 assert((badOut.headers.get("location")||"").includes("wechat=state_error"));
 assert(!badOut.cookies.get("socthink_parent_session"));
 console.log("OAUTH_CALLBACK_NO_REPLAY_AND_BAD_STATE_REJECT_PASS");
 // Vocabulary teacher needs verified cross-app UnionID too, whereas a
 // student opening a word classroom keeps the simpler silent WeChat scope.
 const vocabTeacher="/english/vocabulary/app/teacher/access";
 const vocabTeacherStart=await start(new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/start?next="+encodeURIComponent(vocabTeacher)));
 const vocabTeacherOAuth=new URL(vocabTeacherStart.headers.get("location")||"");
 assert.equal(vocabTeacherOAuth.searchParams.get("scope"),"snsapi_userinfo");
 assert.equal(vocabTeacherOAuth.searchParams.get("appid"),process.env.WECHAT_OPEN_APPID);
 const vocabTeacherState=vocabTeacherOAuth.searchParams.get("state")||"";
 const vocabTeacherCookie=vocabTeacherStart.cookies.get(NAME)?.value||"";
 assert(vocabTeacherState&&vocabTeacherCookie);
 const vocabTeacherReturn=await callback(new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/callback?code=mock-1&state="+vocabTeacherState,
  {headers:{cookie:NAME+"="+vocabTeacherCookie}}));
 assert.equal(vocabTeacherReturn.status,307);
 assert.equal(vocabTeacherReturn.headers.get("location"),
  "https://socthink.cn"+vocabTeacher);
 assert(vocabTeacherReturn.cookies.get("socthink_parent_session")?.value);
 const vocabStudent="/english/vocabulary/app/app/classroom";
 const vocabStudentStart=await start(new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/start?next="+encodeURIComponent(vocabStudent)));
 const vocabStudentOAuth=new URL(vocabStudentStart.headers.get("location")||"");
 assert.equal(vocabStudentOAuth.searchParams.get("scope"),"snsapi_base");
 assert.equal(vocabStudentOAuth.searchParams.get("appid"),process.env.WECHAT_OPEN_APPID);
 const vocabStudentState=vocabStudentOAuth.searchParams.get("state")||"";
 const vocabStudentCookie=vocabStudentStart.cookies.get(NAME)?.value||"";
 assert(vocabStudentState&&vocabStudentCookie);
 const vocabStudentReturn=await callback(new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/callback?code=mock-2&state="+vocabStudentState,
  {headers:{cookie:NAME+"="+vocabStudentCookie}}));
 assert.equal(vocabStudentReturn.headers.get("location"),
  "https://socthink.cn"+vocabStudent);
 console.log("VOCAB_TEACHER_PROFILE_STUDENT_SILENT_AND_EXACT_RETURN_PASS");
 // The new central role hubs use exactly the same official-account
 // OAuth channel, with teacher verified UnionID and student silent scope.
 for(const item of [
  {next:"/english/teacher",scope:"snsapi_userinfo"},
  {next:"/english/student",scope:"snsapi_base"},
 ]){
  const hub=await start(new NextRequest(
   "https://socthink.cn/api/auth/parent/wechat/start?next="+encodeURIComponent(item.next)));
  const oauth=new URL(hub.headers.get("location")||"");
  assert.equal(oauth.searchParams.get("scope"),item.scope);
  assert.equal(oauth.searchParams.get("appid"),process.env.WECHAT_OPEN_APPID);
  const state=oauth.searchParams.get("state")||"";
  const cookie=hub.cookies.get(NAME)?.value||"";
  assert(state&&cookie);
  const result=await callback(new NextRequest(
   "https://socthink.cn/api/auth/parent/wechat/callback?code=mock-1&state="+state,
   {headers:{cookie:NAME+"="+cookie}}));
  assert.equal(result.headers.get("location"),"https://socthink.cn"+item.next);
  assert(result.cookies.get("socthink_parent_session")?.value);
 }
 console.log("ENGLISH_ROLE_HUB_WECHAT_SCOPE_AND_EXACT_RETURN_PASS");


 const web=authenticateOrCreateWechatParent({
  wechatId:"union-teacher-100",unionId:"union-teacher-100",openId:"web-oid-01",oauthMode:"website",
 });
 const oa=authenticateOrCreateWechatParent({
  wechatId:"union-teacher-100",unionId:"union-teacher-100",openId:"oa-oid-02",oauthMode:"official_account",
 });
 assert.equal(web.id,oa.id);
 assert(!("wechatUnionId" in web)&&!("wechatOfficialOpenId" in oa));
 const oaWithoutUnion=authenticateOrCreateWechatParent({
  wechatId:"oa-standalone-03",openId:"oa-standalone-03",oauthMode:"official_account",
 });
 assert.notEqual(oaWithoutUnion.id,web.id);
 const repeat=authenticateOrCreateWechatParent({
  wechatId:"oa-standalone-03",openId:"oa-standalone-03",oauthMode:"official_account",
 });
 assert.equal(repeat.id,oaWithoutUnion.id);
 assert.throws(()=>authenticateOrCreateWechatParent({
   wechatId:"another-union",unionId:"another-union",openId:"oa-oid-02",oauthMode:"official_account",
 }),/WECHAT_UNIONID_MISMATCH/);
 console.log("CROSS_APP_UNIONID_VERIFIED_NOT_OPENID_GUESS_PASS");
 // Real production migration shape: website identity existed before UnionID
 // was explicitly saved; a prior snsapi_base Official Account login created
 // a second parent row. Re-authorization now proves they are one WeChat user.
 const {createParentSessionToken,parentFromSessionToken}=await import("../src/lib/parent-auth");
 const originalDesktop=authenticateOrCreateWechatParent({
  wechatId:"union-legacy-teacher-001",openId:"web-legacy-teacher-001",name:"网站旧账号",
 });
 const originalMobile=authenticateOrCreateWechatParent({
  wechatId:"oa-legacy-teacher-001",openId:"oa-legacy-teacher-001",
  oauthMode:"official_account",name:"公众号旧账号",
 });
 assert.notEqual(originalDesktop.id,originalMobile.id);
 const desktopCookie=createParentSessionToken(originalDesktop.id);
 const mobileCookie=createParentSessionToken(originalMobile.id);
 const unionLinked=authenticateOrCreateWechatParent({
  wechatId:"union-legacy-teacher-001",unionId:"union-legacy-teacher-001",
  openId:"oa-legacy-teacher-001",oauthMode:"official_account",
 });
 assert.equal(unionLinked.id,originalDesktop.id,
  "Verified UnionID must preserve the original desktop account and teacher workspace ID");
 const nextSilent=authenticateOrCreateWechatParent({
  wechatId:"oa-legacy-teacher-001",openId:"oa-legacy-teacher-001",
  oauthMode:"official_account",
 });
 assert.equal(nextSilent.id,originalDesktop.id,
  "Future snsapi_base must prefer the already UnionID-verified owner");
 const nextDesktop=authenticateOrCreateWechatParent({
  wechatId:"union-legacy-teacher-001",unionId:"union-legacy-teacher-001",
  openId:"web-legacy-teacher-001",oauthMode:"website",
 });
 assert.equal(nextDesktop.id,originalDesktop.id);
 assert.equal(parentFromSessionToken(desktopCookie)?.id,originalDesktop.id);
 assert.equal(parentFromSessionToken(mobileCookie)?.id,originalMobile.id,
  "Do not invalidate existing mobile sessions or delete the old record");
 const stored=JSON.parse(fs.readFileSync(path.join(dir,"parents.json"),"utf8")) as
  Array<{id:string;wechatOpenId?:string;wechatOfficialOpenId?:string}>;
 assert(stored.some(u=>u.id===originalMobile.id),"Preserve old account and student history");
 const canonical=stored.find(u=>u.id===originalDesktop.id);
 assert.equal(canonical?.wechatOpenId,"web-legacy-teacher-001",
  "Never overwrite the legacy desktop OpenID with the Official Account OpenID");
 assert.equal(canonical?.wechatOfficialOpenId,"oa-legacy-teacher-001");
 console.log("HISTORIC_TWO_APP_ACCOUNTS_UNIONID_CANONICAL_NONDESTRUCTIVE_PASS");
 console.log("SOCTHINK_WECHAT_OAUTH_STATE_IDENTITY_ISOLATED_E2E_PASS");
}finally{
 globalThis.fetch=originalFetch;
 fs.rmSync(dir,{recursive:true,force:true});
}

