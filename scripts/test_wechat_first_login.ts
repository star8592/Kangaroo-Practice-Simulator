import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

async function main(){
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-wechat-first-"));
const saved = process.env.SOCTHINK_USER_DATA_DIR;
process.env.SOCTHINK_USER_DATA_DIR = dir;
const originalFetch = globalThis.fetch;
const priorAppId = process.env.WECHAT_OPEN_APPID;
const priorSecret = process.env.WECHAT_OPEN_SECRET;
try {
  const auth = await import("../src/lib/parent-auth");
  const { GET } = await import("../src/app/api/auth/parent/me/route");
  assert.equal(auth.PARENT_SESSION_TTL_SECONDS, 30 * 86400);
  const parent = auth.authenticateOrCreateWechatParent({wechatId:"u_test",openId:"o_test",name:"微信用户"});
  const cookie = auth.createParentSessionToken(parent.id);
  assert.equal(auth.parentFromSessionToken(cookie)?.id,parent.id);
  const me = await GET(new NextRequest("https://socthink.cn/api/auth/parent/me", {
    headers:{ cookie:auth.PARENT_SESSION_COOKIE+"="+cookie },
  }));
  assert.equal(me.status,200);
  const renewed = me.cookies.get(auth.PARENT_SESSION_COOKIE);
  assert.equal(renewed?.maxAge,auth.PARENT_SESSION_TTL_SECONDS);
  assert.equal(auth.parentFromSessionToken(renewed?.value)?.id,parent.id);
  assert.equal(me.headers.get("cache-control"),"no-store");
  assert.equal((await GET(new NextRequest("https://socthink.cn/api/auth/parent/me"))).status,401);

  process.env.WECHAT_OPEN_APPID="wx_test_id";
  process.env.WECHAT_OPEN_SECRET="test_secret";
  let called=0;
  globalThis.fetch=async (input)=>{
    called++;
    const url=new URL(String(input));
    assert.equal(url.pathname,"/sns/oauth2/access_token");
    return new Response(JSON.stringify({openid:"silent_user",unionid:"global_user",access_token:"access",scope:"snsapi_base"}));
  };
  const {wechatUserInfo}=await import("../src/lib/wechat-parent-auth");
  const identity=await wechatUserInfo("valid_test_code");
  assert.equal(identity.wechatId,"global_user");
  assert.equal(identity.name,"微信用户");
  assert.equal(called,1,"Basic OAuth must not ask for a profile");
  const miniapp=fs.readFileSync("apps/miniapp/src/services/api.ts","utf8");
  assert.ok(miniapp.includes("allowGuestFallback = false"));
  assert.ok(miniapp.includes("isTemporaryGuest(current)"));
  assert.ok(miniapp.includes("LEGACY_GUEST_BACKUP_KEY"));
  assert.ok(fs.readFileSync("src/components/UnifiedLoginClient.tsx","utf8").includes('fetch("/api/auth/parent/wechat/qr"'));
  console.log("WECHAT_FIRST_LOGIN=PASS basic_oauth=true rolling_30d=true guest_no_auto_fallback=true");
} finally {
  globalThis.fetch=originalFetch;
  if(priorAppId===undefined) delete process.env.WECHAT_OPEN_APPID; else process.env.WECHAT_OPEN_APPID=priorAppId;
  if(priorSecret===undefined) delete process.env.WECHAT_OPEN_SECRET; else process.env.WECHAT_OPEN_SECRET=priorSecret;
  if(saved===undefined) delete process.env.SOCTHINK_USER_DATA_DIR; else process.env.SOCTHINK_USER_DATA_DIR=saved;
  fs.rmSync(dir,{recursive:true,force:true});
}

}
main().catch(e=>{console.error(e);process.exitCode=1});
