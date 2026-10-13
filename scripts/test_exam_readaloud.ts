import assert from "node:assert/strict";
import fs from "node:fs";
import { buildReadAloudText, lowerPrimaryGrade, speechPlainText } from "../src/lib/read-aloud-script";
import { examSpeechAsset } from "../src/lib/exam-audio";
import { trainingQuestions } from "../src/lib/training-question-bank";
import type { Question } from "../src/lib/types";

assert.equal(lowerPrimaryGrade("Pre-A"), true);
assert.equal(lowerPrimaryGrade("Grades 1–2"), true);
assert.equal(lowerPrimaryGrade("Grade 2"), true);
assert.equal(lowerPrimaryGrade("Grade 12"), false);
assert.equal(lowerPrimaryGrade("Grade 10"), false);
assert.equal(lowerPrimaryGrade("Grade 3"), false);
assert.equal(lowerPrimaryGrade("Grades 3–4"), false);
assert.equal(speechPlainText("3 × 4 + \\frac{1}{2}", "zh"), "3 乘以 4 + 2分之1");
assert.equal(speechPlainText("3 × 4 + \\frac{1}{2}", "en"), "3 times 4 + 1 over 2");
const choices = [{ key: "A", label: "8" }, { key: "B", label: "12" }];
const spoken = buildReadAloudText("3 × 4 = ?", choices, "zh");
assert.ok(spoken.includes("选项A，8"));
assert.ok(spoken.includes("选项B，12"));
assert.ok(!spoken.includes("正确答案"));
const picture = buildReadAloudText("选出图形", [{ key: "A", label: "" }], "zh");
assert.ok(picture.includes("选项A，请查看题目中的选项图片"));
const one = examSpeechAsset("3 × 4 = ?", choices, "zh")!;
const two = examSpeechAsset("3 × 4 = ?", [{ key: "A", label: "8" }, { key: "B", label: "13" }], "zh")!;
assert.notEqual(one.url, two.url);
assert.ok(one.url.startsWith("/exam-read-aloud/v1/"));
assert.ok(one.file.endsWith(".mp3"));

const question = {
  id: "test-g1", year: 2026, level: "test", grades: "Grade 1", language: "zh",
  questionNo: 1, points: 3, concept: "加法", stem: "2 + 2 = ?",
  choices, answer: "B", solution: "not public", sourceFile: "fake.json",
} as Question;
const publicQ = trainingQuestions([question])[0];
assert.ok(!("answer" in publicQ));
assert.ok(!("solution" in publicQ));
assert.equal(publicQ.stemEn, undefined, "must not invent English text");
assert.equal(publicQ.choicesEn, undefined, "must not invent English options");

const reportPath = "reports/exam-read-aloud-worklist.json";
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.ok(report.covered.length >= 1);
  assert.equal(report.tasks.length, new Set(report.tasks.map((task: { url: string }) => task.url)).size);
  for (const task of report.tasks) {
    assert.ok(["zh", "en"].includes(task.language));
    assert.ok(task.text.trim().length > 0);
    assert.ok(task.file.endsWith(task.url));
    assert.ok(!task.text.includes("正确答案："));
  }
  console.log("EXAM_READ_ALOUD_TEST=PASS exams=" + report.covered.length +
    " questions=" + report.covered.reduce((acc: number, q: { questionCount: number }) => acc + q.questionCount, 0) +
    " tracks=" + report.tasks.length);
} else {
  console.log("EXAM_READ_ALOUD_TEST=PASS pure-contracts-only; run prepare_exam_readaloud.ts for inventory audit");
}
