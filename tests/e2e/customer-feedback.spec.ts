import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createStudent, createSessionToken, SESSION_COOKIE } from "../../src/lib/auth";

const DATA = path.join(process.cwd(), "private", "users");

test("customer can report result and problem explanation without leaking across attempts", async ({ page, context }) => {
  const configuredURL = new URL(process.env.E2E_BASE_URL || "https://unconfigured.invalid");
  test.skip(process.env.SOCTHINK_E2E_SYNTHETIC !== "1" ||
    !["localhost", "127.0.0.1"].includes(configuredURL.hostname),
    "Requires an isolated local test server and explicit synthetic fixture opt-in");
  const suffix = crypto.randomBytes(4).toString("hex");
  const user = createStudent({
    username: "feedback-" + suffix,
    candidateNo: "FB-" + suffix,
    name: "Feedback E2E",
    grade: 6,
    pin: "1234",
  });
  const attemptId = "att_" + crypto.randomBytes(9).toString("hex");
  const examId = "sample-feedback-" + suffix;
  const questionId = "question_" + suffix;
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(path.join(DATA, "exam-attempts.jsonl"), JSON.stringify({
    id: attemptId, userId: user.id, sessionId: "session_sample", candidateNo: user.candidateNo,
    examId, profile: { name: "Synthetic feedback test", grades: "G6", questionCount: 1, maxScore: 1, paperType: "practice" },
    startedAt: Date.now()-120000, submittedAt: Date.now()-1000, elapsedSeconds: 119,
    grade: { score: 0, maxScore: 1, correct: 0, wrong: 1, blank: 0,
      byPoints: {"1":{ correct:0,total:1 }},
      byConcept: {"arithmetic":{correct:0,total:1}},
      items: [{questionId,questionNo:1,correct:false,selected:"B",correctAnswer:"A",points:1,concept:"arithmetic",solution:"One plus one is two."}] },
    questions: [{questionId,questionNo:1,points:1,concept:"arithmetic",selected:"B",correctAnswer:"A",correct:false,
      dwellMs:5000,firstAnswerMs:1000,answerChanges:0,flagCount:0,answerHistory:["B"],awayMs:0,tabAwayCount:0,
      reviewSnapshot:{stem:"1 + 1 = ?",choices:[{key:"A",label:"2"},{key:"B",label:"3"}],answerMode:"choice"}}],
    events:[],
  })+"\n");
  await context.addCookies([{ name: SESSION_COOKIE, value: createSessionToken(user.id), url: process.env.E2E_BASE_URL || "http://127.0.0.1:4318" }]);
  await page.addInitScript((data) => {
    localStorage.setItem("math-competition-last-attempt",JSON.stringify(data));
  }, {examId,profile:{name:"Synthetic feedback test",paperType:"practice"},
    grade:{score:0,maxScore:1,correct:0,wrong:1,blank:0,attemptId,
      byPoints:{"1":{correct:0,total:1}},byConcept:{"arithmetic":{correct:0,total:1}},
      items:[{questionId,questionNo:1,correct:false,selected:"B",correctAnswer:"A",points:1,concept:"arithmetic",solution:"One plus one is two."}]},
    elapsedSeconds:119,submittedAt:Date.now()});
  await page.goto("/result");
  await expect(page.getByRole("heading",{name:"这次测评帮到你了吗？"})).toBeVisible();
  await page.getByRole("button",{name:"测评报告不准确"}).click();
  await page.locator("textarea").fill("测试：报告需要更精确描述知识点。");
  await page.getByRole("button",{name:"提交反馈"}).click();
  await expect(page.getByText("反馈已保存，谢谢。")).toBeVisible();

  await page.goto("/review?attemptId=" + attemptId);
  await expect(page.getByRole("heading",{name:"逐题复盘"})).toBeVisible();
  await page.getByRole("button",{name:"直接看解析"}).click();
  await expect(page.getByRole("heading",{name:"这道题有问题吗？"})).toBeVisible();
  await page.getByRole("button",{name:"题目/答案有误"}).click();
  await page.locator("textarea").fill("测试：请核对原题和正确答案。");
  await page.getByRole("button",{name:"提交反馈"}).click();
  await expect(page.getByText("反馈已保存，谢谢。")).toBeVisible();

  const feedbackDir = path.join(DATA,"customer-feedback");
  const records: string[] = [];
  for (const u of fs.readdirSync(feedbackDir)) {
    const folder=path.join(feedbackDir,u);
    for(const day of fs.readdirSync(folder)){
      for(const name of fs.readdirSync(path.join(folder,day))){
        if(name.endsWith(".json")) records.push(fs.readFileSync(path.join(folder,day,name),"utf8"));
      }
    }
  }
  const own = records.filter(v => v.includes(attemptId));
  expect(own).toHaveLength(2);
  expect(own.some(v=>v.includes(questionId))).toBe(true);
  expect(own.some(v=>v.includes("report_inaccurate"))).toBe(true);
  expect(own.some(v=>v.includes("question_error"))).toBe(true);
});
