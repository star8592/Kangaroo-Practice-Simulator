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
 assert.equal(oa1.searchParams.get("scope"),"snsapi_base");
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
 const state2=oa2.searchParams.get("state")||"";
 const cookie2=started2.cookies.get(NAME)?.value||"";
 assert.notEqual(state1,state2);
 assert.equal(validateWechatMobileFlow(cookie2,state1)?.next,
   "/english/pronunciation/app/teacher/homework");
 assert.equal(validateWechatMobileFlow(cookie2,state2)?.next,
   "/english/pronunciation/app/a/teacher-assignment/abc");
 const redirect1=decodeURIComponent(oa1.searchParams.get("redirect_uri")||"");
 assert.equal(redirect1,"https://socthink.cn/api/auth/parent/wechat/callback");
 globalThis.fetch=async(input:RequestInfo|URL)=>{
   const uri=String(input);
   assert(uri.startsWith("https://api.weixin.qq.com/sns/oauth2/access_token"),
     "Unexpected provider request");
   const params=new URL(uri).searchParams;
   assert.equal(params.get("appid"),process.env.WECHAT_OPEN_APPID,
     "Used website AppID for official-account mobile login");
   return new Response(JSON.stringify({
     access_token:"isolated-oa-access-token",
     openid:"oa-verified-openid-001",
     unionid:"union-same-user-001",
     scope:"snsapi_base",
   }),{status:200,headers:{"content-type":"application/json"}});
 };
 const cb1=new NextRequest("https://socthink.cn/api/auth/parent/wechat/callback?code=mock-1&state="+state1,
  {headers:{cookie:NAME+"="+cookie2}});
 const out1=await callback(cb1);
 assert.equal(out1.status,307);
 assert.equal(out1.headers.get("location"),"https://socthink.cn/english/pronunciation/app/teacher/homework");
 assert(out1.cookies.get("socthink_parent_session")?.value);
 const remaining=out1.cookies.get(NAME)?.value||"";
 assert.equal(validateWechatMobileFlow(remaining,state1),null);
 assert.equal(validateWechatMobileFlow(remaining,state2)?.next,
   "/english/pronunciation/app/a/teacher-assignment/abc");
 console.log("OFFICIAL_ACCOUNT_FORCED_APPID_AND_TWO_JOURNEYS_PASS");
 const cb2=new NextRequest("https://socthink.cn/api/auth/parent/wechat/callback?code=mock-2&state="+state2,
  {headers:{cookie:NAME+"="+remaining}});
 const out2=await callback(cb2);
 assert.equal(out2.headers.get("location"),
  "https://socthink.cn/english/pronunciation/app/a/teacher-assignment/abc");
 const invalid=new NextRequest(
  "https://socthink.cn/api/auth/parent/wechat/callback?code=bad&state="+state1,
  {headers:{cookie:NAME+"="+cookie2.replace(/.$/,"x")}});
 const badOut=await callback(invalid);
 assert((badOut.headers.get("location")||"").includes("wechat=state_error"));
 assert(!badOut.cookies.get("socthink_parent_session"));
 console.log("OAUTH_CALLBACK_NO_REPLAY_AND_BAD_STATE_REJECT_PASS");
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
 console.log("SOCTHINK_WECHAT_OAUTH_STATE_IDENTITY_ISOLATED_E2E_PASS");
}finally{
 globalThis.fetch=originalFetch;
 fs.rmSync(dir,{recursive:true,force:true});
}

