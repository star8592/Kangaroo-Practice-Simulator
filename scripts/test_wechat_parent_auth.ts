import assert from "node:assert/strict";

async function main() {
  process.env.WECHAT_OPEN_APPID = "wx_test_app";
  process.env.WECHAT_OPEN_SECRET = "dummy";
  process.env.WECHAT_CALLBACK_ORIGIN = "https://socthink.cn";
  process.env.WECHAT_LOGIN_MODE = "official_account";

  const mod = await import("../src/lib/wechat-parent-auth");
  assert.equal(mod.wechatConfigured(), true);
  assert.equal(mod.wechatLoginMode(), "official_account");

  const official = new URL(mod.wechatAuthorizeUrl("state123"));
  assert.equal(official.origin, "https://open.weixin.qq.com");
  assert.equal(official.pathname, "/connect/oauth2/authorize");
  assert.equal(official.searchParams.get("appid"), "wx_test_app");
  assert.equal(official.searchParams.get("scope"), "snsapi_userinfo");
  assert.equal(official.searchParams.get("state"), "state123");
  assert.equal(
    decodeURIComponent(official.searchParams.get("redirect_uri") || ""),
    "https://socthink.cn/api/auth/parent/wechat/callback",
  );

  const website = new URL(mod.wechatAuthorizeUrl("state456", "website"));
  assert.equal(website.pathname, "/connect/qrconnect");
  assert.equal(website.searchParams.get("scope"), "snsapi_login");

  console.log("WECHAT_PARENT_AUTH=PASS official_account=true website_compat=true");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
