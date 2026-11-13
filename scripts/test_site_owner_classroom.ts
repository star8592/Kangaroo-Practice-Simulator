import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-owner-test-"));
process.env.SOCTHINK_USER_DATA_DIR = root;
process.env.AUTH_EMAIL_PROVIDER = "outbox";

async function run() {
  // Import AFTER test data directory is established. Never touch real users.
  const legacy = await import("../src/lib/auth");
  const parentAuth = await import("../src/lib/parent-auth");
  const owner = await import("../src/lib/site-owner");
  const start = await import("../src/app/api/admin/site-owner/start/route");
  const confirm = await import("../src/app/api/admin/site-owner/confirm/route");
  const readiness = await import("../src/app/api/admin/site-owner/readiness/route");
  const me = await import("../src/app/api/auth/parent/me/route");
  const admin = legacy.createAdmin({username:"owner_test",name:"Owner",pin:"555123999"});
  const parent = parentAuth.authenticateOrCreateWechatParent({wechatId:"wxOwner123",openId:"ownerOpen123"});
  const stranger = parentAuth.authenticateOrCreateWechatParent({wechatId:"wxStranger567"});
  const adminCookie = legacy.SESSION_COOKIE + "=" + legacy.createSessionToken(admin.id);
  const parentCookie = parentAuth.PARENT_SESSION_COOKIE + "=" + parentAuth.createParentSessionToken(parent.id);
  const both = adminCookie + "; " + parentCookie;
  const endpoint = "https://socthink.cn/api/admin/site-owner/";
  function request(action:"start"|"confirm", body:object, cookies:string, origin="https://socthink.cn") {
    return new NextRequest(endpoint + action, {
      method:"POST",headers:{"Content-Type":"application/json",origin,cookie:cookies},
      body:JSON.stringify(body),
    });
  }
  assert.equal((await start.POST(request("start",{email:"owner@example.org"},""))).status,403);
  assert.equal((await start.POST(request("start",{email:"owner@example.org"},adminCookie))).status,403);
  assert.equal((await start.POST(request("start",{email:"owner@example.org"},parentCookie))).status,403);
  assert.equal((await start.POST(request("start",{email:"owner@example.org"},both,"https://evil.test"))).status,403);
  assert.equal(owner.hasSiteOwnerBinding(),false);
  const sent = await start.POST(request("start",{email:"owner@example.org"},both));
  assert.equal(sent.status,200,JSON.stringify(await sent.clone().json()));
  const outbox = fs.readFileSync(path.join(root,"email-outbox.jsonl"),"utf8").trim().split("\n");
  const otp = JSON.parse(outbox.at(-1)!).code;
  assert.match(otp,/^\d{6}$/);
  assert.equal((await confirm.POST(request("confirm",{email:"owner@example.org",code:otp==="000000"?"111111":"000000"},both))).status,400);
  // An OTP issued for one WeChat account cannot be applied to another.
  const changedWechat = adminCookie + "; " + parentAuth.PARENT_SESSION_COOKIE + "=" + parentAuth.createParentSessionToken(stranger.id);
  assert.equal((await confirm.POST(request("confirm",{email:"owner@example.org",code:otp},changedWechat))).status,403);
  assert.equal(owner.hasSiteOwnerBinding(),false);
  assert.equal((await confirm.POST(request("confirm",{email:"owner@example.org",code:otp},both))).status,400,
    "a challenge consumed by a different identity must not remain reusable");

  // Resend is rate-limited; reset only isolated test challenge file to emulate a new 10-min window.
  fs.rmSync(path.join(root,"auth-challenges.json"));
  const resent = await start.POST(request("start",{email:"owner2@example.org"},both));
  assert.equal(resent.status,200);
  const secondOutbox=fs.readFileSync(path.join(root,"email-outbox.jsonl"),"utf8").trim().split("\n");
  const secondCode=JSON.parse(secondOutbox.at(-1)!).code;
  const ok=await confirm.POST(request("confirm",{email:"owner2@example.org",code:secondCode},both));
  assert.equal(ok.status,200,JSON.stringify(await ok.clone().json()));
  assert.equal(owner.isSiteOwner(parent),true);
  assert.equal(owner.isSiteOwner(stranger),false);
  assert.equal(owner.readSiteOwner()?.contactEmail,"owner2@example.org");
  assert.ok(owner.readSiteOwner()?.emailVerifiedAt);
  assert.equal(fs.statSync(path.join(root,"site-owner-binding.json")).mode & 0o777,0o600);
  assert.equal((await start.POST(request("start",{email:"takeover@example.org"},both))).status,409);
  const ownerMe = await me.GET(new NextRequest("https://socthink.cn/api/auth/parent/me",
    {headers:{cookie:parentCookie}}));
  assert.equal((await ownerMe.json()).siteAdmin,true);
  const strangerMe = await me.GET(new NextRequest("https://socthink.cn/api/auth/parent/me",{
    headers:{cookie:parentAuth.PARENT_SESSION_COOKIE + "=" + parentAuth.createParentSessionToken(stranger.id)},
  }));
  assert.equal((await strangerMe.json()).siteAdmin,false);
  assert.equal((await (await readiness.GET()).json()).status,"configured");
  console.log("SOCTHINK_OWNER_EMAIL_WECHAT_BOOTSTRAP_PASS=18");
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(root,{recursive:true,force:true}));
