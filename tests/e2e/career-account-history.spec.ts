import {expect,test} from "@playwright/test";
import crypto from "node:crypto";
import path from "node:path";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE}
  from "../../src/lib/parent-auth";

/**
 * Requires a dedicated /tmp fixture root shared by this process and its local
 * Next process. This test intentionally never runs against production URLs.
 * Do not use live credentials, customer records, or the release data root.
 */
const base=process.env.E2E_BASE_URL??"http://127.0.0.1:4318";
const fixtureRoot=process.env.SOCTHINK_USER_DATA_DIR??"";
const approved=process.env.E2E_ALLOW_SYNTHETIC_FIXTURE==="1" &&
  ["127.0.0.1","localhost"].includes(new URL(base).hostname) &&
  new URL(base).protocol==="http:" &&
  fixtureRoot.startsWith("/tmp/socthink-career-history-") &&
  path.resolve(fixtureRoot)===fixtureRoot;
test.skip(!approved,"Runs only with a specifically isolated local user-data fixture");
test.setTimeout(90_000);

test("verified WeChat buyer sees saved grading, cross-browser history, and strict ownership",async({page,browser})=>{
  const unique=crypto.randomUUID();
  const parentA=authenticateOrCreateWechatParent({
    wechatId:"career-e2e-"+unique+"-a",name:"Synthetic Career A",
  });
  const parentB=authenticateOrCreateWechatParent({
    wechatId:"career-e2e-"+unique+"-b",name:"Synthetic Career B",
  });
  const cookieA=createParentSessionToken(parentA.id);
  const cookieB=createParentSessionToken(parentB.id);
  await page.context().addCookies([{
    name:PARENT_SESSION_COOKIE,value:cookieA,url:base,httpOnly:true,sameSite:"Lax",
  }]);
  expect((await page.goto("/career/practice/supplier-selection-001"))?.status()).toBe(200);
  const history=page.getByText("我的微信账号练习记录（0 次）");
  await expect(history).toBeVisible();
  await page.getByRole("checkbox",{name:/甲厂 A/}).check();
  await page.getByRole("checkbox",{name:/丙厂 C/}).check();
  await page.getByRole("button",{name:"下一题"}).click();
  await page.locator('input[inputmode="numeric"]').fill("657");
  await page.getByRole("button",{name:"下一题"}).click();
  await page.locator('input[inputmode="numeric"]').fill("34821");
  await page.getByRole("button",{name:"下一题"}).click();
  await page.getByRole("radio",{name:/丙厂 C/}).check();
  await page.getByRole("button",{name:"下一题"}).click();
  await page.locator('input[inputmode="numeric"]').fill("71");
  await page.getByRole("button",{name:"下一题"}).click();
  await page.getByRole("radio",{name:/没有一家满足/}).check();
  await page.getByRole("button",{name:"提交答卷并查看报告"}).click();
  const report=page.locator('section[aria-label="职业案例成绩报告"]');
  await expect(report).toContainText(/100\s*\/\s*100/);
  await expect(page.getByText(/本次成绩已保存到微信账号/)).toBeVisible();
  await expect(page.getByText("我的微信账号练习记录（1 次）")).toBeVisible();
  await page.reload();
  await expect(page.getByText("我的微信账号练习记录（1 次）")).toBeVisible();
  await page.getByText("我的微信账号练习记录（1 次）").click();
  await page.getByRole("button",{name:"查看完整报告"}).click();
  await expect(report).toContainText(/100\s*\/\s*100/);

  const savedList=await (await page.request.get("/api/career/practice/history")).json() as {
    attempts:{attemptId:string;score:number}[];
  };
  expect(savedList.attempts).toHaveLength(1);
  expect(savedList.attempts[0].score).toBe(100);
  const savedId=savedList.attempts[0].attemptId;

  // New clean browser context (not sharing localStorage) with the same
  // independently verified account must recover the server-held record.
  const clean=await browser.newContext({baseURL:base});
  try{
    await clean.addCookies([{
      name:PARENT_SESSION_COOKIE,value:cookieA,url:base,httpOnly:true,sameSite:"Lax",
    }]);
    const second=await clean.newPage();
    await second.goto("/career/practice/supplier-selection-001");
    await expect(second.getByText("我的微信账号练习记录（1 次）")).toBeVisible();
    await second.getByText("我的微信账号练习记录（1 次）").click();
    await second.getByRole("button",{name:"查看完整报告"}).click();
    await expect(second.locator('section[aria-label="职业案例成绩报告"]'))
      .toContainText(/100\s*\/\s*100/);
  }finally{await clean.close();}

  // Distinct WeChat buyer must see an empty history and cannot fetch
  // another buyer's full report by guessing or copying the attempt ID.
  const foreign=await browser.newContext({baseURL:base});
  try{
    await foreign.addCookies([{
      name:PARENT_SESSION_COOKIE,value:cookieB,url:base,httpOnly:true,sameSite:"Lax",
    }]);
    const other=await foreign.newPage();
    await other.goto("/career/practice/supplier-selection-001");
    await expect(other.getByText("我的微信账号练习记录（0 次）")).toBeVisible();
    const response=await other.request.get("/api/career/practice/history?attemptId="+savedId);
    expect(response.status()).toBe(404);
    const list=await (await other.request.get("/api/career/practice/history")).json() as {
      attempts:unknown[];
    };
    expect(list.attempts).toEqual([]);
  }finally{await foreign.close();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
