import assert from "node:assert/strict";

async function main(){
 process.env.WECHAT_OPEN_APPID="wx_test_app";
 process.env.WECHAT_OPEN_SECRET="dummy";
 process.env.WECHAT_CALLBACK_ORIGIN="https://www.socthink.cn";
 const mod=await import("../src/lib/wechat-parent-auth");
 assert.equal(mod.wechatConfigured(),true);
 const u=mod.wechatAuthorizeUrl("state123");
 const parsed=new URL(u);
 assert.equal(parsed.origin,"https://open.weixin.qq.com");
 assert.equal(parsed.pathname,"/connect/qrconnect");
 assert.equal(parsed.searchParams.get("appid"),"wx_test_app");
 assert.equal(parsed.searchParams.get("scope"),"snsapi_login");
 assert.equal(parsed.searchParams.get("state"),"state123");
 assert.equal(decodeURIComponent(parsed.searchParams.get("redirect_uri")||""),"https://www.socthink.cn/api/auth/parent/wechat/callback");
 console.log("WECHAT_PARENT_AUTH=PASS mode=website scope=snsapi_login");
}
main().catch((error)=>{console.error(error);process.exit(1)});
