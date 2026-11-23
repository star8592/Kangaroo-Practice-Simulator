import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function main() {
  const previous = process.cwd();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "soc-single-exam-e2e-"));
  process.env.SOCTHINK_USER_DATA_DIR = path.join(temp, "private", "users");
  process.chdir(temp);
  try {
    const { NextRequest } = await import("next/server");
    const auth = await import("../src/lib/auth");
    const policy = await import("../src/lib/exam-service-policy");
    const entitlement = await import("../src/lib/exam-entitlement-store");
    const examApi = await import("../src/app/api/exams/[examId]/route");
    const sessions = await import("../src/app/api/exam-sessions/route");
    const grading = await import("../src/app/api/grade/route");
    const { buildDiagnosticReport } = await import("../src/lib/diagnostic-report");
    const { loadExamAttempts } = await import("../src/lib/attempt-store");
    const dir = path.join(temp, "private", "commerce-exams");
    fs.mkdirSync(dir, { recursive: true });
    const examId = "zoumei-style-g6-2026-test-a";
    const otherId = "zoumei-style-g6-2026-test-b";
    for (const id of [examId, otherId]) {
      const profile = {
        id, name: "Owner-authored grade 6 mock fixture", nameZh: "原创模拟卷隔离验收",
        country: "中国", year: 2026, grades: "六年级", durationSeconds: 1800,
        questionCount: 1, initialScore: 0, maxScore: 3,
        wrongPenaltyMode: "fixed", wrongPenaltyValue: 0, formatId: "zoumei-style",
        paperType: "practice", timingMode: "recommended", sourceRegistryId: "user-original-math-simulations",
        rightsPolicy: { rightsClass: "user-original", commercialUse: true, publicQuestionDisplay: true }
      };
      const questions = [{ id: id+"-q1", questionNo:1, year:2026, level:"G6", grades:"六年级",
        language:"zh", points:3, concept:"addition", stem:"2 + 2 = ?", choices:[
          {key:"A", label:"3"},{key:"B",label:"4"}], answerMode:"choice",answer:"B",
        solution:"2 + 2 = 4", sourceFile:"isolated-fixture"}];
      fs.writeFileSync(path.join(dir, id+".json"), JSON.stringify({profile, questions}));
    }
    const user = auth.createStudent({username:"single_paid_test",candidateNo:"SINGLE-001",name:"测试学生",grade:6,pin:"12345678"});
    const otherUser = auth.createStudent({username:"single_unpaid_test",candidateNo:"SINGLE-002",name:"未付费学生",grade:6,pin:"12345678"});
    const token = auth.createSessionToken(user.id);
    const unpaidToken = auth.createSessionToken(otherUser.id);
    const req = (endpoint: string, bearer: string, body?: unknown) => new NextRequest(
      "http://localhost" + endpoint,
      body === undefined ? {headers: {Authorization: "Bearer "+bearer}} :
      {method: "POST", headers: {"Content-Type":"application/json",Authorization:"Bearer "+bearer}, body: JSON.stringify(body)}
    );
    const context = (id:string) => ({params:Promise.resolve({examId:id})});
    const deniedUnpaid = await examApi.GET(req("/api/exams/"+examId,unpaidToken),context(examId));
    assert.equal(deniedUnpaid.status,403);
    const beforePurchase = await examApi.GET(req("/api/exams/"+examId,token),context(examId));
    assert.equal(beforePurchase.status,403);
    const purchase = entitlement.grantExamEntitlement({
      purchaseRef:"synthetic-paid-order-001", userId:user.id,
      productId:policy.EXAM_DIAGNOSTIC_PRODUCT_ID,examCredits:1,
      allowedCompetitionIds:["zoumei-style"],allowedExamId:examId,
    });
    assert.equal(purchase.summary.total,1);
    const wrongYear = await examApi.GET(req("/api/exams/"+otherId,token),context(otherId));
    assert.equal(wrongYear.status,403);
    const chosen = await examApi.GET(req("/api/exams/"+examId,token),context(examId));
    assert.equal(chosen.status,200);
    const started = await sessions.POST(req("/api/exam-sessions",token,{examId}));
    assert.equal(started.status,200);
    const startedValue = await started.json();
    assert.equal(entitlement.getExamEntitlementSummary(user.id).available,0);
    const again = await sessions.POST(req("/api/exam-sessions",token,{examId}));
    assert.equal(again.status,200);
    assert.equal((await again.json()).session.id,startedValue.session.id);
    const wrongStart = await sessions.POST(req("/api/exam-sessions",token,{examId:otherId}));
    assert.equal(wrongStart.status,409);
    const finished = await grading.POST(req("/api/grade",token,{
      examId,sessionId:startedValue.session.id,answers:{[examId+"-q1"]:"B"},events:[],lang:"zh",
    }));
    assert.equal(finished.status,200);
    const result = await finished.json();
    assert.equal(result.correct,1);
    assert.equal(result.score,3);
    assert.equal(entitlement.getExamEntitlementSummary(user.id).consumed,1);
    const report = buildDiagnosticReport(user,result.attemptId);
    assert.ok(report);
    assert.equal(report?.exam.id,examId);
    assert.equal(report?.questions?.[0]?.stem,"2 + 2 = ?");
    assert.equal(report?.questions?.[0]?.solution,"2 + 2 = 4");
    const React = await import("react");
    const ReactDomServer = await import("react-dom/server");
    const DiagnosticReportDocument = (await import("../src/components/DiagnosticReportDocument")).default;
    const { renderDiagnosticReportPdfFromHtml } = await import("../src/lib/diagnostic-report-pdf");
    const markup = ReactDomServer.renderToStaticMarkup(
      React.createElement(DiagnosticReportDocument, {report: report!, attemptId: result.attemptId})
    );
    const reportHtml = '<!doctype html><html lang="zh"><head><meta charset="UTF-8"></head><body>' + markup + '</body></html>';
    assert.ok(reportHtml.includes("本题完整解析"));
    assert.ok(reportHtml.includes("2 + 2 = 4"));
    assert.equal((reportHtml.match(/class="report-page"/g) || []).length, 7);
    const pdfBytes = renderDiagnosticReportPdfFromHtml(reportHtml);
    assert.equal(pdfBytes.subarray(0, 5).toString("utf8"), "%PDF-");
    assert.ok(pdfBytes.length > 10_000, "rendered report PDF must not be empty");
    const pdfArtifact = path.join(temp, "diagnostic-report.pdf");
    fs.writeFileSync(pdfArtifact, pdfBytes);
    const fixtureEvidence = process.env.SOCTHINK_E2E_REPORT_EVIDENCE;
    if (fixtureEvidence) {
      fs.mkdirSync(path.dirname(fixtureEvidence), { recursive: true });
      fs.copyFileSync(pdfArtifact, fixtureEvidence);
    }
    assert.equal(loadExamAttempts(user.id).length,1);
    const repeat = await grading.POST(req("/api/grade",token,{
      examId,sessionId:startedValue.session.id,answers:{[examId+"-q1"]:"A"},events:[],
    }));
    assert.equal(repeat.status,200);
    const repeatedResult = await repeat.json();
    assert.equal(repeatedResult.attemptId,result.attemptId);
    assert.equal(loadExamAttempts(user.id).length,1);
    const future = await sessions.POST(req("/api/exam-sessions",token,{examId}));
    assert.equal(future.status,402);
    const replay = entitlement.grantExamEntitlement({
      purchaseRef:"synthetic-paid-order-001",userId:user.id,
      productId:policy.EXAM_DIAGNOSTIC_PRODUCT_ID,examCredits:1,
      allowedCompetitionIds:["zoumei-style"],allowedExamId:examId
    });
    assert.equal(replay.idempotent,true);
    assert.equal(replay.summary.consumed,1);
    console.log(JSON.stringify({
      ok:true,selectedExam:examId,paidCredits:1,wrongYearBlocked:true,
      unpaidUserBlocked:true,reportCreated:true,recordedScore:3,
      repeatSubmissionReturnsSameAttempt:true,secondExamBlocked:true
    },null,2));
  } finally {
    process.chdir(previous);
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
