import {expect,test} from "@playwright/test";
import crypto from "node:crypto";
import path from "node:path";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE}
  from "../../src/lib/parent-auth";

/** Account history E2E must never run against production user records.
 * Only the CI-owned isolated fixture directory is permitted.
 * This test covers the 24-item formal exam exclusively; six-item exercise
 * data and legacy application routes are absent by design.
 */
const base=process.env.E2E_BASE_URL??"http://127.0.0.1:4318";
const fixtureRoot=process.env.SOCTHINK_USER_DATA_DIR??"";
const approved=process.env.E2E_ALLOW_SYNTHETIC_FIXTURE==="1"&&
  ["127.0.0.1","localhost"].includes(new URL(base).hostname)&&
  new URL(base).protocol==="http:"&&
  fixtureRoot.startsWith("/tmp/socthink-career-history-")&&
  path.resolve(fixtureRoot)===fixtureRoot;
test.skip(!approved,"Runs only in an explicitly isolated local user-data fixture");
test.setTimeout(90_000);
const EXAM="/career/exams/procurement-paper-2026q4-v1";
const HISTORY="/api/career/exam/history";

test("signed-in WeChat user can recover full formal exam report across browsers without exposing other accounts",async({page,browser})=>{
  const unique=crypto.randomUUID();
  const a=authenticateOrCreateWechatParent({
    wechatId:"career-formal-e2e-"+unique+"-a",name:"Synthetic Formal A",
  });
  const b=authenticateOrCreateWechatParent({
    wechatId:"career-formal-e2e-"+unique+"-b",name:"Synthetic Formal B",
  });
  const tokenA=createParentSessionToken(a.id);
  const tokenB=createParentSessionToken(b.id);
  await page.context().addCookies([{
    name:PARENT_SESSION_COOKIE,value:tokenA,url:base,httpOnly:true,sameSite:"Lax",
  }]);
  expect((await page.goto(EXAM))?.status()).toBe(200);
  await expect(page.getByText("我的微信账号笔试成绩（0 次）")).toBeVisible();
  await page.getByRole("checkbox",{name:/我已阅读入场规则/}).check();
  await page.getByRole("button",{name:"确认入场 · 开始模拟笔试"}).click();
  await expect(page.getByLabel("岗位正式模拟笔试考场")).toBeVisible();
  await page.getByRole("textbox",{name:/某零部件需要490件预计合格品/}).fill("500");
  await page.getByRole("button",{name:"检查答卷 / 提前交卷"}).click();
  await page.getByRole("button",{name:"确认交卷 · 查看成绩"}).click();
  await expect(page.getByRole("heading",{level:2,name:"逐题解析"})).toBeVisible();
  await expect(page.getByText("我的微信账号笔试成绩（1 次）")).toBeVisible();
  await expect(page.locator("main").last()).toContainText("已作答 1/24 题");
  const saved=await (await page.request.get(HISTORY)).json() as {
    attempts:{attemptId:string;score:number;caseId:string}[];
  };
  expect(saved.attempts).toHaveLength(1);
  expect(saved.attempts[0].score).toBe(5);
  expect(saved.attempts[0].caseId).toBe("procurement-paper-2026q4-v1");
  const savedId=saved.attempts[0].attemptId;

  // After closing the result/reloading there must still be a history entry
  // on the admission screen. That is the user-visible cross-device path.
  await page.reload();
  await expect(page.getByText("我的微信账号笔试成绩（1 次）")).toBeVisible();
  await page.getByText("我的微信账号笔试成绩（1 次）").click();
  await page.getByRole("button",{name:"查看完整报告"}).click();
  await expect(page.getByRole("heading",{level:2,name:"逐题解析"})).toBeVisible();
  await expect(page.locator("main").last()).toContainText("已作答 1/24 题");

  const another=await browser.newContext({baseURL:base});
  try{
    await another.addCookies([{
      name:PARENT_SESSION_COOKIE,value:tokenA,url:base,httpOnly:true,sameSite:"Lax",
    }]);
    const second=await another.newPage();
    await second.goto(EXAM);
    await expect(second.getByText("我的微信账号笔试成绩（1 次）")).toBeVisible();
    await second.getByText("我的微信账号笔试成绩（1 次）").click();
    await second.getByRole("button",{name:"查看完整报告"}).click();
    await expect(second.getByRole("heading",{level:2,name:"逐题解析"})).toBeVisible();
  }finally{await another.close();}

  const otherContext=await browser.newContext({baseURL:base});
  try{
    await otherContext.addCookies([{
      name:PARENT_SESSION_COOKIE,value:tokenB,url:base,httpOnly:true,sameSite:"Lax",
    }]);
    const other=await otherContext.newPage();
    await other.goto(EXAM);
    await expect(other.getByText("我的微信账号笔试成绩（0 次）")).toBeVisible();
    expect((await other.request.get(HISTORY+"?attemptId="+savedId)).status()).toBe(404);
    const otherHistory=await (await other.request.get(HISTORY)).json() as {
      attempts:unknown[];
    };
    expect(otherHistory.attempts).toHaveLength(0);
  }finally{await otherContext.close();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
