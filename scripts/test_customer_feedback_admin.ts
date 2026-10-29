import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseFeedbackInput, saveCustomerFeedback } from "../src/lib/customer-feedback";
import { readCustomerFeedbackOverview } from "../src/lib/customer-feedback-admin";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-feedback-admin-"));
const now = new Date("2026-10-30T00:00:00Z");
const record = (category: string, message: string, key: string) =>
  parseFeedbackInput({ attemptId: "att_1234567890abcdef", examId: "amc8-math",
    questionId: "question-1", category, message, source: "review", idempotencyKey: key });
const idem = (i: number) => ["fixture", "feedback", "admin",String(i).padStart(10,"0")].join("_");
try {
  saveCustomerFeedback("student_test_1", record("solution_unclear", "步骤看不懂", idem(1)), { root, now });
  saveCustomerFeedback("student_test_2", record("question_error", "13800138000 answer wrong", idem(2)), { root, now });
  saveCustomerFeedback("student_test_3", record("report_inaccurate", "tester@example.com 110101199003070011", idem(3)), { root, now });
  const result = readCustomerFeedbackOverview({ root, now: now.getTime() + 1000, days: 2, limit: 2 });
  assert.equal(result.total, 3);
  assert.equal(result.highPriority, 2);
  assert.equal(result.categories.question_error, 1);
  assert.equal(result.categories.report_inaccurate, 1);
  assert.equal(result.categories.solution_unclear, 1);
  assert.equal(result.truncated, true);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].category, "question_error");
  assert(!JSON.stringify(result).includes("student_test"));
  assert(!JSON.stringify(result).includes("13800138000"));
  assert(!JSON.stringify(result).includes("tester@example.com"));
  assert(!JSON.stringify(result).includes("110101199003070011"));
  assert.equal(readCustomerFeedbackOverview({ root, now: now.getTime() + 86400e3 * 31, days: 30 }).total, 0);
  const extra = path.join(root,"not-hashed-user","2026-10-30");
  fs.mkdirSync(extra, {recursive:true});
  fs.writeFileSync(path.join(extra,crypto.randomBytes(16).toString("hex")+".json"),"{invalid}");
  assert.equal(readCustomerFeedbackOverview({ root, now: now.getTime(), days: 2 }).unreadable, 0);
  assert.throws(()=>readCustomerFeedbackOverview({ root,days:500 }));
  console.log("FEEDBACK_ADMIN_OVERVIEW=PASS priority+privacy+date+limits+no_public_user_ids");
} finally {
  fs.rmSync(root,{ recursive: true, force: true });
}
