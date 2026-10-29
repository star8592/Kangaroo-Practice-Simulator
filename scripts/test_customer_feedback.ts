import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FeedbackError, parseFeedbackInput, saveCustomerFeedback } from "../src/lib/customer-feedback";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-feedback-"));
const testKey = (n: number) => ["fixture", "feedback", String(n).padStart(12, "0")].join("_");
const base = {
  attemptId: "att_1234567890abcdef", examId: "maa-2023-amc8", questionId: "q_123",
  category: "question_error", rating: 4, message: "题目和图形有冲突",
  source: "review", idempotencyKey: testKey(78),
};
const input = parseFeedbackInput(base);
assert.equal(input.rating, 4);
for (const invalid of [
  { ...base, idempotencyKey: "../../x" },
  { ...base, category: "secret" },
  { ...base, message: "a".repeat(401) },
  { ...base, rating: 6 },
  { ...base, examId: "../../invalid" },
]) assert.throws(() => parseFeedbackInput(invalid), FeedbackError);
try {
  const opts = { root, now: new Date("2026-10-29T11:00:00Z"), perDayLimit: 2 };
  assert.equal(saveCustomerFeedback("user1", input, opts).duplicate, false);
  assert.equal(saveCustomerFeedback("user1", input, opts).duplicate, true);
  assert.equal(saveCustomerFeedback("user2", input, opts).duplicate, false);
  assert.equal(saveCustomerFeedback("user1", { ...input, idempotencyKey: testKey(79) }, opts).duplicate, false);
  assert.throws(() => saveCustomerFeedback("user1", { ...input, idempotencyKey: testKey(80) }, opts),
    (e: unknown) => e instanceof FeedbackError && e.status === 429);
  const values: string[] = [];
  for (const userDir of fs.readdirSync(root)) for (const day of fs.readdirSync(path.join(root,userDir))) {
    for (const file of fs.readdirSync(path.join(root,userDir,day))) {
      if (file.endsWith(".json")) values.push(fs.readFileSync(path.join(root,userDir,day,file),"utf8"));
    }
  }
  assert.equal(values.length,3);
  assert(values.every(v=>!v.includes("user1") && !v.includes(testKey(78))));
  assert(values.some(v=>v.includes("题目和图形有冲突")));
  console.log("CUSTOMER_FEEDBACK_TEST=PASS validation+idempotency+private+rate_limit");
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
