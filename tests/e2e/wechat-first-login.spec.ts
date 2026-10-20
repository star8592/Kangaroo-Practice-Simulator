import { expect, test } from "@playwright/test";

test("visitors see an automatic WeChat QR rather than a parent/student decision", async ({ page }) => {
  const fakeTicket="wqt_"+"a".repeat(48);
  const transparentPng="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WL0X84AAAAASUVORK5CYII=";
  let issued=0;
  await page.route("**/api/auth/parent/wechat/qr", async route=>{
    issued++;
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
      ticket:fakeTicket,qrDataUrl:transparentPng,expiresAt:Date.now()+180000,
    })});
  });
  await page.route("**/api/auth/parent/wechat/qr/status?**", route=>route.fulfill({
    status:200,contentType:"application/json",body:JSON.stringify({status:"pending"}),
  }));
  await page.goto("/login");
  await expect(page.getByRole("heading",{name:"微信扫一扫，马上开始学习"})).toBeVisible();
  await expect(page.getByRole("img",{name:"使用手机微信扫描此二维码登录或注册"})).toBeVisible();
  if(test.info().project.name==="mobile-chromium") {
    await expect(page.getByRole("button",{name:"分享到微信 / 复制链接"})).toBeVisible();
  } else {
    await expect(page.getByRole("button",{name:"分享到微信 / 复制链接"})).toHaveCount(0);
  }
  expect(issued).toBe(1);
  await expect(page.getByLabel("学生 PIN")).toBeHidden();
  await page.getByText("其他登录方式（已有账号）").click();
  await expect(page.getByLabel("学生 PIN")).toBeVisible();
  await expect(page.getByRole("button",{name:"使用已有学生账号"})).toBeDisabled();
});

test("QR generation starts before slow session checks finish", async ({ page }) => {
  const fakeTicket = "wqt_" + "b".repeat(48);
  const transparentPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WL0X84AAAAASUVORK5CYII=";
  let qrRequests = 0;
  let releaseChecks: () => void = () => {};
  const blocked = new Promise<void>(resolve => { releaseChecks = resolve; });

  for (const endpoint of ["**/api/auth/parent/me", "**/api/auth/me"]) {
    await page.route(endpoint, async route => {
      await blocked;
      await route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"not logged in"}' });
    });
  }
  await page.route("**/api/auth/parent/wechat/qr", async route => {
    qrRequests++;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ticket: fakeTicket, qrDataUrl: transparentPng, expiresAt: Date.now() + 180_000,
    }) });
  });
  await page.route("**/api/auth/parent/wechat/qr/status?**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"status":"pending"}' }));

  try {
    await page.goto("/login");
    await expect.poll(() => qrRequests, { timeout: 8_000 }).toBe(1);
    await expect(page.getByText("正在准备微信登录…")).toBeVisible();
  } finally {
    releaseChecks();
  }
  await expect(page.getByRole("img", { name: "使用手机微信扫描此二维码登录或注册" })).toBeVisible();
  expect(qrRequests).toBe(1);
});

test("approved website application QR uses the official WeChat iframe and matching callback", async ({ page }) => {
  const ticket = "wqt_" + "a".repeat(48);
  const state = "wqs_" + "b".repeat(48);
  const callback = "https://socthink.cn/api/auth/parent/wechat/callback";
  const authorized = new URL("https://open.weixin.qq.com/connect/qrconnect");
  authorized.searchParams.set("appid", "wx203f8050411f3f97");
  authorized.searchParams.set("redirect_uri", callback);
  authorized.searchParams.set("scope", "snsapi_login");
  authorized.searchParams.set("response_type", "code");
  authorized.searchParams.set("state", state);

  await page.route("**/api/auth/parent/me", route =>
    route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"not logged in"}' }));
  await page.route("**/api/auth/me", route =>
    route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"not logged in"}' }));
  await page.route("**/api/auth/parent/wechat/qr", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ticket, qrAuthorizeUrl: authorized.toString(), expiresAt: Date.now() + 180_000,
    }) }));
  await page.route("**/api/auth/parent/wechat/qr/status?**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"status":"pending"}' }));

  // Replace only the remote script, preserving its iframe construction contract.
  await page.route("https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js", route =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: `
      window.WxLogin = function(options) {
        const iframe = document.createElement("iframe");
        const url = new URL("https://open.weixin.qq.com/connect/qrconnect");
        url.searchParams.set("appid", options.appid);
        url.searchParams.set("scope", options.scope);
        url.searchParams.set("redirect_uri", decodeURIComponent(options.redirect_uri));
        url.searchParams.set("state", options.state);
        url.searchParams.set("self_redirect", String(options.self_redirect));
        iframe.src = url.toString();
        document.getElementById(options.id).appendChild(iframe);
      };
    ` }));
  await page.route("https://open.weixin.qq.com/connect/qrconnect?**", route =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Official WeChat QR mock</body></html>" }));

  await page.goto("/login");
  const frame = page.getByRole("group", { name: "使用手机微信扫描此二维码登录或注册" }).locator("iframe");
  await expect(frame).toHaveCount(1);
  const src = await frame.getAttribute("src");
  const embedded = new URL(src || "");
  expect(embedded.origin).toBe("https://open.weixin.qq.com");
  expect(embedded.pathname).toBe("/connect/qrconnect");
  expect(embedded.searchParams.get("appid")).toBe("wx203f8050411f3f97");
  expect(embedded.searchParams.get("scope")).toBe("snsapi_login");
  expect(embedded.searchParams.get("redirect_uri")).toBe(callback);
  expect(embedded.searchParams.get("state")).toBe(state);
  expect(embedded.searchParams.get("self_redirect")).toBe("true");
});

test("admin operations cannot be viewed by anonymous visitors", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText("运营总览", { exact: true })).toHaveCount(0);

  await page.goto("/admin/families");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText("用户与家庭", { exact: true })).toHaveCount(0);
});
