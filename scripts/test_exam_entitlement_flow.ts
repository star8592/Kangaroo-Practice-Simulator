import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-single-exam-"));
  process.env.SOCTHINK_USER_DATA_DIR = dataDir;
  try {
    const store = await import("../src/lib/exam-entitlement-store");
    const policy = await import("../src/lib/exam-service-policy");
    const competitions = ["australian-amc", "cemc", "kangaroo", "maa-amc"];
    const purchase = {
      purchaseRef: "order-single-exam-001",
      userId: "stu_single_exam_test",
      productId: "math-competition-diagnostic",
      examCredits: 1,
      allowedCompetitionIds: competitions,
      allowedExamId: "kangaroo-2025-grade-5",
    };
    assert.equal(policy.EXAM_DIAGNOSTIC_CREDITS, 1);
    const first = store.grantExamEntitlement(purchase);
    assert.equal(first.idempotent, false);
    assert.deepEqual(first.summary, {purchaseRequired:true,total:1,available:1,reserved:0,consumed:0,expired:0});
    assert.equal(first.entitlements.length, 1);
    assert.equal(first.entitlements[0].creditIndex, 1);
    const replay = store.grantExamEntitlement(purchase);
    assert.equal(replay.idempotent, true);
    assert.equal(replay.summary.total, 1);
    assert.throws(() => store.grantExamEntitlement({...purchase, userId:"different-student"}), /CONFLICT/);
    assert.throws(() => store.grantExamEntitlement({...purchase, examCredits:5}), /INVALID_EXAM_ENTITLEMENT_PRODUCT_OR_QUANTITY/);
    assert.throws(() => store.grantExamEntitlement({...purchase, allowedExamId:"kangaroo-2026-grade-5"}), /CONFLICT/);
    const now = Date.now();
    const selected = {userId:purchase.userId,sessionId:"session-1",examId:"kangaroo-2025-grade-5",competitionId:"kangaroo",expiresAt:now+120_000};
    const held = store.reserveExamEntitlement(selected);
    assert.equal(held.ok, true);
    assert.equal(store.getExamEntitlementSummary(purchase.userId).available, 0);
    const same = store.reserveExamEntitlement(selected);
    assert.equal(same.ok, true);
    if (same.ok) assert.equal(same.idempotent, true);
    const parallel = store.reserveExamEntitlement({...selected,sessionId:"session-2",examId:"other-exam"});
    assert.equal(parallel.ok,false);
    if (!parallel.ok) assert.equal(parallel.reason,"exam_in_progress");
    assert.equal(store.releaseExamEntitlement(purchase.userId,"session-1"),true);
    assert.equal(store.getExamEntitlementSummary(purchase.userId).available,1);
    const unsupported = store.reserveExamEntitlement({...selected,sessionId:"session-outside",competitionId:"unknown"});
    assert.equal(unsupported.ok,false);
    if (!unsupported.ok) assert.equal(unsupported.reason,"exam_not_included");
    const wrongYear = store.reserveExamEntitlement({...selected,sessionId:"session-wrong-year",examId:"kangaroo-2026-grade-5"});
    assert.equal(wrongYear.ok,false);
    if (!wrongYear.ok) assert.equal(wrongYear.reason,"exam_not_included");
    assert.equal(store.hasAvailableExamCreditForExam(purchase.userId,"kangaroo-2025-grade-5"),true);
    assert.equal(store.hasAvailableExamCreditForExam(purchase.userId,"kangaroo-2026-grade-5"),false);
    const reserved = store.reserveExamEntitlement(selected);
    assert.equal(reserved.ok,true);
    store.beginExamEntitlementSubmission(purchase.userId,"session-1");
    const consumed = store.consumeExamEntitlement({userId:purchase.userId,sessionId:"session-1",attemptId:"attempt-1"});
    assert.equal(consumed.status,"consumed");
    assert.ok(store.getExamEntitlementForAttempt(purchase.userId,selected.examId,"attempt-1"));
    const finalSummary = store.getExamEntitlementSummary(purchase.userId);
    assert.deepEqual(finalSummary,{purchaseRequired:true,total:1,available:0,reserved:0,consumed:1,expired:0});
    const second = store.reserveExamEntitlement({...selected,sessionId:"session-second",examId:"kangaroo-2026-grade-5"});
    assert.equal(second.ok,false);
    if (!second.ok) assert.equal(second.reason,"no_exam_credit");
    const replayAfterUse = store.grantExamEntitlement(purchase);
    assert.equal(replayAfterUse.idempotent,true);
    assert.deepEqual(replayAfterUse.summary,finalSummary);
    assert.equal(policy.isFormalStaticMockExam("past"),true);
    assert.equal(policy.isFormalStaticMockExam("sample"),true);
    assert.equal(policy.isFormalStaticMockExam("practice"),false);
    assert.equal(policy.isFormalStaticMockExam("smart"),false);
    const commercialProfile = {
      id:"original-2026-6-a", name:"Original mock", grades:"6", questionCount:15,
      durationSeconds:5400, paperType:"practice", sourceRegistryId:"user-original-math-simulations",
      rightsPolicy:{commercialUse:true,publicQuestionDisplay:true}
    } as unknown as Parameters<typeof policy.isCommercialMockExamReady>[0];
    assert.equal(policy.isCommercialMockExamReady(commercialProfile),true);
    assert.equal(policy.isCommercialMockExamReady({...commercialProfile,rightsPolicy:{commercialUse:false,publicQuestionDisplay:true}}),false);
    assert.equal(policy.isCommercialMockExamReady({...commercialProfile,rightsPolicy:{commercialUse:true,publicQuestionDisplay:false}}),false);
    assert.equal(policy.isCommercialMockExamReady({...commercialProfile,durationSeconds:0}),false);
    assert.equal(policy.isCommercialMockExamReady({...commercialProfile,paperType:"smart"}),false);
    console.log(JSON.stringify({ok:true,grantCredits:1,consumedAttempts:1,secondExamBlocked:true,finalSummary,replayDoesNotReset:true},null,2));
  } finally {
    fs.rmSync(dataDir,{recursive:true,force:true});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
