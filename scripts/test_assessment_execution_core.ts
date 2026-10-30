import assert from "node:assert/strict";
import type { AssessmentBlueprintContract } from "../src/lib/assessment-core-contract";
import {
  assessmentSubmissionDigest, evaluateAssessment,
  type AssessmentSubmission, type ItemEvaluation,
} from "../src/lib/assessment-execution-core";

const fixedTime = "2026-10-30T04:00:00.000Z";
const blueprint: AssessmentBlueprintContract = {
  id: "career-sql-001", revision: 1, domain: "career", title: "SQL basics",
  itemRefs: [{id:"sql-question-1",revision:2},{id:"sql-question-2",revision:1}],
  gradingMode: "isolated-execution", totalPoints: 10,
};
const submission: AssessmentSubmission = {
  attemptId: "att_123456", actorId: "learner_1234", blueprintId: blueprint.id,
  blueprintRevision: blueprint.revision, submittedAt: fixedTime,
  answers: {"sql-question-1":"SELECT COUNT(*) FROM t", "sql-question-2":"SELECT * FROM t"},
};
const score: ItemEvaluation[] = [
  {itemId:"sql-question-1",itemRevision:2,score:5,maxScore:5,
    evidenceRef:"sandbox-run:fixture-1",rubricVersion:"sql-v1",evaluatorVersion:"sql-engine-v1"},
  {itemId:"sql-question-2",itemRevision:1,score:2,maxScore:5,
    evidenceRef:"sandbox-run:fixture-2",rubricVersion:"sql-v1",evaluatorVersion:"sql-engine-v1"},
];

async function main() {
  const digest = assessmentSubmissionDigest(blueprint, submission);
  assert.match(digest,/^[a-f0-9]{64}$/);
  const reversed = {...submission,answers:Object.fromEntries(Object.entries(submission.answers).reverse())};
  assert.equal(assessmentSubmissionDigest(blueprint,reversed), digest, "digest must not depend on object key order");
  assert.notEqual(assessmentSubmissionDigest(blueprint,{...submission,submittedAt:"2026-10-30T04:00:01.000Z"}),digest);
  const options = {authorized:true,persistedSnapshotDigest:digest,scoredAt:fixedTime};
  const evaluated = await evaluateAssessment(blueprint,submission,async()=>[score[1],score[0]],options);
  assert.equal(evaluated.score,7);
  assert.equal(evaluated.maxScore,10);
  assert.deepEqual(evaluated.evidence.map(x=>x.itemId),blueprint.itemRefs.map(x=>x.id));
  assert.equal(evaluated.evidence[0].itemRevision,2);
  assert.equal(evaluated.mode,"isolated-execution");

  async function fails(
    bp:AssessmentBlueprintContract, sub:AssessmentSubmission, evidence:ItemEvaluation[],
    opts:typeof options, expected:string,
  ) {
    await assert.rejects(evaluateAssessment(bp,sub,async()=>evidence,opts),new RegExp(expected));
  }
  await fails(blueprint,submission,score,{...options,authorized:false},"access-denied");
  await fails(blueprint,submission,score,{...options,persistedSnapshotDigest:"wrong"},"snapshot-mismatch");
  await fails(blueprint,{...submission,blueprintRevision:2},score,options,"version-mismatch");
  await fails(blueprint,{...submission,answers:{...submission.answers,"other-q":"spoof"}},score,options,"unknown-or-invalid-answer");
  await fails(blueprint,submission,[score[0],score[0]],options,"incomplete-or-duplicate-evidence");
  await fails(blueprint,submission,[{...score[0],itemRevision:3},score[1]],options,"revision-mismatch");
  await fails(blueprint,submission,[{...score[0],evidenceRef:""},score[1]],options,"missing-evaluation-provenance");
  await fails(blueprint,submission,[{...score[0],score:10},score[1]],options,"invalid-item-score");
  await fails(blueprint,submission,[{...score[0],maxScore:4,score:4},score[1]],options,"score-maximum-blueprint-mismatch");
  const rubricBp:AssessmentBlueprintContract={...blueprint,gradingMode:"rubric-reviewed"};
  await fails(rubricBp,submission,score,options,"rubric-review-missing");
  const withReviewer=score.map(x=>({...x,reviewedBy:"teacher-42"}));
  const rubric=await evaluateAssessment(rubricBp,submission,async()=>withReviewer,options);
  assert.equal(rubric.score,7);

  const scaleBp:AssessmentBlueprintContract={...blueprint,gradingMode:"non-scored-scale",totalPoints:undefined};
  const scaleEv=score.map(({itemId,itemRevision,evaluatorVersion,rubricVersion,evidenceRef})=>({itemId,itemRevision,evaluatorVersion,rubricVersion,evidenceRef}));
  const scale=await evaluateAssessment(scaleBp,submission,async()=>scaleEv,options);
  assert.equal(scale.score,null);
  assert.equal(scale.maxScore,null);
  await fails(scaleBp,submission,score,options,"non-scored-scale-must-not-return-marks");
  console.log("ASSESSMENT_EXECUTION_CORE=PASS (career-sql mock, rubric, non-scored, authorization, revision, provenance)");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
