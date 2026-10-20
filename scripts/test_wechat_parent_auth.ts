import assert from "node:assert/strict";

async function main() {
  process.env.WECHAT_OPEN_APPID = "wx_test_app";
  process.env.WECHAT_OPEN_SECRET = "dummy";
  process.env.WECHAT_CALLBACK_ORIGIN = "https://socthink.cn";
  process.env.WECHAT_LOGIN_MODE = "official_account";
  process.env.WECHAT_WEBSITE_APPID = "wx_website_test_app";
  process.env.WECHAT_WEBSITE_SECRET = "website-dummy";

  const mod = await import("../src/lib/wechat-parent-auth");
  assert.equal(mod.wechatConfigured(), true);
  assert.equal(mod.wechatLoginMode(), "official_account");

  const official = new URL(mod.wechatAuthorizeUrl("state123"));
  assert.equal(official.origin, "https://open.weixin.qq.com");
  assert.equal(official.pathname, "/connect/oauth2/authorize");
  assert.equal(official.searchParams.get("appid"), "wx_test_app");
  assert.equal(official.searchParams.get("scope"), "snsapi_base");
  assert.equal(official.searchParams.get("state"), "state123");
  assert.equal(
    decodeURIComponent(official.searchParams.get("redirect_uri") || ""),
    "https://socthink.cn/api/auth/parent/wechat/callback",
  );

  assert.equal(mod.wechatConfigured("website"), true);
  const website = new URL(mod.wechatAuthorizeUrl("state456", "website"));
  assert.equal(website.pathname, "/connect/qrconnect");
  assert.equal(website.searchParams.get("appid"), "wx_website_test_app");
  assert.equal(website.searchParams.get("scope"), "snsapi_login");
  assert.equal(
    decodeURIComponent(website.searchParams.get("redirect_uri") || ""),
    "https://socthink.cn/api/auth/parent/wechat/callback",
  );

  const originalFetch = globalThis.fetch;
  let tokenRequest = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const requestedUrl = String(input);
    if (requestedUrl.includes("/sns/userinfo")) {
      return new Response(JSON.stringify({
        openid: "dummy-openid",
        unionid: "dummy-unionid",
        nickname: "微信家长",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    tokenRequest = requestedUrl;
    return new Response(JSON.stringify({
      access_token: "dummy-token",
      openid: "dummy-openid",
      unionid: "dummy-unionid",
      scope: "snsapi_login",
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const user = await mod.wechatUserInfo("dummy-code", "website");
    const tokenUrl = new URL(tokenRequest);
    assert.equal(tokenUrl.searchParams.get("appid"), "wx_website_test_app");
    assert.equal(tokenUrl.searchParams.get("secret"), "website-dummy");
    assert.equal(user.wechatId, "dummy-unionid");
    assert.equal(user.name, "微信家长");
  } finally {
    globalThis.fetch = originalFetch;
  }

  delete process.env.WECHAT_WEBSITE_APPID;
  delete process.env.WECHAT_WEBSITE_SECRET;
  assert.equal(mod.wechatConfigured("website"), false);
  assert.equal(mod.wechatConfigured("official_account"), true);

  console.log("WECHAT_PARENT_AUTH=PASS official_account=true website_compat=true");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
