import {expect,test} from "@playwright/test";

const teacher="/english/pronunciation/app/teacher/homework";
const homework="/english/pronunciation/app/a/"+
  "12345678-1234-8234-8234-123456789abc/"+ "a".repeat(64);

function unauthenticated(route:import("@playwright/test").Route){
  return route.fulfill({status:401,contentType:"application/json",body:'{"error":"not logged in"}'});
}

test("one-phone iPhone Safari: display share handoff, never issue unscannable desktop QR",async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
  });
  try{
    const page=await context.newPage();
    let qrRequests=0;
    await page.route("**/api/auth/parent/me",unauthenticated);
    await page.route("**/api/auth/parent/wechat/qr",route=>{
      qrRequests++;
      return route.fulfill({status:503});
    });
    await page.addInitScript(()=>{
      Object.defineProperty(navigator,"share",{
        configurable:true,
        value:async (payload:{title:string;url:string})=>{
          (window as typeof window & {__testWechatShare?:{title:string;url:string}}).__testWechatShare=payload;
        },
      });
    });
    await page.goto("/login?next="+encodeURIComponent(teacher));
    await expect(page.getByTestId("wechat-mobile-one-device")).toBeVisible();
    await expect(page.getByText("一部手机即可完成微信登录")).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(qrRequests).toBe(0);
    await page.getByRole("button",{name:"分享／复制登录链接"}).click();
    const payload=await page.evaluate(()=>
      (window as typeof window & {__testWechatShare?:{title:string;url:string}}).__testWechatShare);
    expect(payload?.url).toContain("next="+encodeURIComponent(teacher));
  }finally{await context.close()}
});

test("one-phone Android browser: homework link preserves assignment and shows no QR",async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:393,height:852},
    userAgent:"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  });
  try{
    const page=await context.newPage();
    let qrRequests=0;
    await page.route("**/api/auth/parent/me",unauthenticated);
    await page.route("**/api/auth/parent/wechat/qr",route=>{
      qrRequests++;
      return route.fulfill({status:503});
    });
    await page.goto("/login?next="+encodeURIComponent(homework));
    await expect(page.getByTestId("wechat-mobile-one-device")).toBeVisible();
    await expect(page.getByRole("heading",{name:"微信登录，完成英语作业"})).toBeVisible();
    expect(qrRequests).toBe(0);
  }finally{await context.close()}
});

test("WeChat built-in mobile browser starts direct OAuth without desktop QR",async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.60(0x18003c29) NetType/WIFI Language/zh_CN",
  });
  try{
    const page=await context.newPage();
    let qrRequests=0;
    await page.route("**/api/auth/parent/me",unauthenticated);
    await page.route("**/api/auth/parent/wechat/qr",route=>{
      qrRequests++;
      return route.fulfill({status:503});
    });
    await page.route("**/api/auth/parent/wechat/start**",route=>
      route.fulfill({status:200,contentType:"text/plain",body:"OAUTH_HANDOFF_TEST"}));
    const request=page.waitForRequest(req=>req.url().includes("/api/auth/parent/wechat/start?"));
    await page.goto("/login?next="+encodeURIComponent(teacher));
    const auth=await request;
    expect(new URL(auth.url()).searchParams.get("next")).toBe(teacher);
    expect(qrRequests).toBe(0);
  }finally{await context.close()}
});

test("failed WeChat callback displays error without automatic OAuth loop, preserves next",async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.60",
  });
  try{
    const page=await context.newPage();
    let oauthRequests=0;
    await page.route("**/api/auth/parent/me",unauthenticated);
    await page.route("**/api/auth/parent/wechat/start**",route=>{
      oauthRequests++;
      return route.fulfill({status:200,body:"OAuth retry fixture"});
    });
    await page.goto("/login?wechat=failed&next="+encodeURIComponent(teacher));
    await expect(page.locator("p[role=alert]")).toContainText("微信授权没有完成");
    expect(oauthRequests).toBe(0);
    await page.getByRole("button",{name:"重新连接微信"}).click();
    await expect.poll(()=>oauthRequests).toBe(1);
  }finally{await context.close()}
});
