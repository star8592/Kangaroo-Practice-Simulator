import {test,expect} from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {createAdmin,createSessionToken,SESSION_COOKIE} from "../../src/lib/auth";
import {parseFeedbackInput,saveCustomerFeedback} from "../../src/lib/customer-feedback";
import {userDataPath} from "../../src/lib/user-data-store";

test("admin verifies a customer complaint, records evidence, and preserves original feedback",async({page,context})=>{
  const base=new URL(process.env.E2E_BASE_URL||"https://not-allowed.invalid");
  test.skip(process.env.SOCTHINK_E2E_SYNTHETIC!=="1"||
    !["127.0.0.1","localhost"].includes(base.hostname),
    "Never create synthetic administrator records in production");
  const nonce=crypto.randomBytes(5).toString("hex");
  const admin=createAdmin({username:"case-admin-"+nonce,name:"Synthetic QA",pin:"pass-"+nonce+"-long"});
  const feedback=saveCustomerFeedback("synthetic-"+nonce,parseFeedbackInput({
    attemptId:"att_1234567890abcdef",examId:"practice-"+nonce,
    questionId:"q1",category:"question_error",source:"review",
    message:"Synthetic case "+nonce+" question answer mismatch",
    idempotencyKey:"fixture_feedback_"+nonce,
  }));
  const guest=await page.request.patch("/api/admin/feedback-cases",{
    headers:{"origin":base.origin},data:{feedbackId:feedback.id,expectedVersion:0,to:"investigating",
      note:"An authorized operator must perform this review"},
  });
  expect(guest.status()).toBe(403);
  await context.addCookies([{name:SESSION_COOKIE,value:createSessionToken(admin.id),url:base.origin}]);
  await page.goto("/admin/feedback");
  await expect(page.getByRole("heading",{name:"客户反馈处理台"})).toBeVisible();
  const row=page.locator("tr").filter({hasText:"practice-"+nonce});
  await expect(row.locator("strong[class*=\"status\"]")).toHaveText("待核查");
  await row.locator("textarea").fill("已核对原始试卷和正式答案，正在进行复核");
  await row.getByRole("button",{name:"记录处理"}).click();
  await expect(row.locator("strong[class*=\"status\"]")).toHaveText("核查中");
  await row.locator("textarea").fill("发现该题解题步骤错误，已按原卷修改并核对");
  await row.locator('input[placeholder*="证据"]').fill("commit:0123456789abcdef");
  await row.getByRole("button",{name:"记录处理"}).click();
  await expect(row.locator("strong[class*=\"status\"]")).toHaveText("已修复／有结论");
  await page.reload();
  await expect(page.locator("tr").filter({hasText:"practice-"+nonce})
    .locator("strong[class*=\"status\"]")).toHaveText("已修复／有结论");
  const ledger=fs.readFileSync(userDataPath("customer-feedback-case-events.jsonl"),"utf8");
  const events=ledger.trim().split("\n").map(x=>JSON.parse(x) as {feedbackId:string;to:string})
    .filter(x=>x.feedbackId===feedback.id);
  expect(events.map(e=>e.to)).toEqual(["investigating","resolved"]);
  const root=userDataPath("customer-feedback");
  const originalFiles:string[]=[];
  for(const userDir of fs.readdirSync(root)){
    const userPath=path.join(root,userDir);
    for(const day of fs.readdirSync(userPath)){
      const entry=path.join(userPath,day,feedback.id+".json");
      if(fs.existsSync(entry)) originalFiles.push(fs.readFileSync(entry,"utf8"));
    }
  }
  expect(originalFiles).toHaveLength(1);
  expect(originalFiles[0]).toContain("Synthetic case "+nonce);
  expect(originalFiles[0]).not.toContain("已核对原始试卷");
});
