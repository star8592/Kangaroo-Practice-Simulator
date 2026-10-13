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
