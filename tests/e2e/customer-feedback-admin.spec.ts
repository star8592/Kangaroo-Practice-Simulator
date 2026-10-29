import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import { createAdmin, createSessionToken, SESSION_COOKIE } from "../../src/lib/auth";
import { parseFeedbackInput, saveCustomerFeedback } from "../../src/lib/customer-feedback";

test("only an authorized admin can read anonymized customer feedback", async ({ page, context }) => {
  const base = new URL(process.env.E2E_BASE_URL || "https://unconfigured.invalid");
  test.skip(process.env.SOCTHINK_E2E_SYNTHETIC !== "1" ||
    !["localhost", "127.0.0.1"].includes(base.hostname),
    "Needs isolated local test server and explicit synthetic fixture opt-in");

  await page.goto("/admin/feedback");
  await expect(page).toHaveURL(/\/admin\/login/);
  const suffix = crypto.randomBytes(5).toString("hex");
  const admin = createAdmin({ username:"feedback-admin-"+suffix,name:"Synthetic operator",pin:"123456" });
  const marker = "admin-feedback-"+suffix;
  saveCustomerFeedback("synthetic-"+suffix,
    parseFeedbackInput({
      attemptId:"att_1234567890abcdef",examId:"practice-"+suffix,questionId:"q1",
      category:"question_error",message:marker+" 13800138000",
      source:"review",idempotencyKey:"fixture_"+suffix+"_"+crypto.randomBytes(4).toString("hex"),
    }));
  await context.addCookies([{
    name: SESSION_COOKIE, value: createSessionToken(admin.id), url:base.origin,
  }]);
  await page.goto("/admin/feedback");
  await expect(page.getByRole("heading",{name:"客户反馈处理台"})).toBeVisible();
  await expect(page.getByText(marker+" [手机号已隐藏]")).toBeVisible();
  await expect(page.getByText("题目／答案问题").first()).toBeVisible();
  await expect(page.getByText("13800138000")).toHaveCount(0);
  await page.getByRole("link",{name:"运营总览"}).first().click();
  await expect(page.getByText("近30天客户反馈")).toBeVisible();
});
