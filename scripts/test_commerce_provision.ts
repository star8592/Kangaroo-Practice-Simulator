import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/internal/commerce/students/route";

function request(body: unknown, token?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", 'Bearer ' + token);
  return new NextRequest("http://localhost/api/internal/commerce/students", {
    method: "POST", headers, body: JSON.stringify(body),
  });
}
async function response(body: unknown, token?: string) {
  const res = await POST(request(body, token));
  return { status: res.status, value: await res.json() as Record<string, any> };
}
async function main() {
  const token = process.env.COMMERCEFLOW_PROVISION_TOKEN || "";
  const userDataDir = process.env.SOCTHINK_USER_DATA_DIR || "";
  if (!token || !userDataDir) throw new Error("test requires isolated COMMERCEFLOW_PROVISION_TOKEN and SOCTHINK_USER_DATA_DIR");
  const examId = "original-single-exam-test-2026";
  const filename = path.join(process.cwd(), "private", "exams", examId + ".json");
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  if (fs.existsSync(filename)) throw new Error("test fixture collision, refusing to overwrite");

  const bundle = {
    profile: {
      id: examId, name: "Original test mock (non-production)", grades: "6",
      questionCount: 1, durationSeconds: 1800, maxScore: 3, initialScore: 0,
      wrongPenaltyMode: "fixed", wrongPenaltyValue: 0,
      country: "fixture", year: 2026, paperType: "sample",
      competitionId: "kangaroo", sourceRegistryId: "user-original-math-simulations",
      rightsPolicy: { rightsClass: "user-original", commercialUse: true, publicQuestionDisplay: true },
    },
    questions: [{
      id: examId + "-q1", year: 2026, level: "G6", grades: "6", language: "zh",
      questionNo: 1, points: 3, concept: "number_logic", stem: "1 + 1 = ?",
      choices: [{key:"A",label:"2"},{key:"B",label:"3"}], answer: "A",
      solution: "1 + 1 = 2", sourceFile: "test-only",
    }],
  };
  fs.writeFileSync(filename, JSON.stringify(bundle), { flag: "wx" });

  try {
    const base = {
      externalRef: "order-single-attempt-contract-test-001",
      productId: "math-competition-diagnostic",
      examCredits: 1, examId,
      name: "测试学生", grade: 6, school: "Test School", pin: "48273193",
    };
    const unauth = await response(base);
    assert.equal(unauth.status, 401);
    const wrongQuantity = await response({...base,examCredits:5},token);
    assert.equal(wrongQuantity.status, 400);
    const wrongExam = await response({...base,examId:"another-year"},token);
    assert.equal(wrongExam.status, 422);
    const created = await response(base,token);
    assert.equal(created.status, 201, JSON.stringify(created));
    assert.equal(created.value.entitlement.total, 1);
    assert.equal(created.value.entitlement.selectedExamId, examId);
    const replay = await response(base,token);
    assert.equal(replay.status,200, JSON.stringify(replay));
    assert.equal(replay.value.idempotent,true);
    assert.equal(replay.value.entitlement.total,1);
    const conflict = await response({...base, name:"另一个学生"},token);
    assert.equal(conflict.status,409);
    const users = JSON.parse(fs.readFileSync(path.join(userDataDir,"users.json"),"utf8"));
    assert.equal(users.length,1);
    assert.ok(String(users[0].pinHash||"").startsWith("scrypt$"));
    const credits = JSON.parse(fs.readFileSync(path.join(userDataDir,"exam-entitlements.json"),"utf8"));
    assert.equal(credits.length,1);
    assert.equal(credits[0].allowedExamId,examId);
    console.log(JSON.stringify({ok:true,unauthorized:401,wrongCreditsBlocked:true,wrongYearBlocked:true,singleCredit:1,idempotent:true,users:1,entitlements:1},null,2));
  } finally {
    fs.rmSync(filename,{force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
