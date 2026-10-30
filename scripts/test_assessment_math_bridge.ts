import assert from "node:assert/strict";
import { gradeMathWithParityReceipt } from "../src/lib/assessment-math-bridge";
import { gradeExam } from "../src/lib/grading";
import type { ExamBundle, ExamProfile, Question } from "../src/lib/types";

function question(id:string, no:number, points:number, answer:string, answerMode:"choice"|"integer"="choice"):Question {
  return {
    id,questionNo:no,points,answer,answerMode,concept:"number",stem:"Synthetic test only",
    choices:[],solution:"Internal synthetic fixture",sourceFile:"test-fixture",year:2026,
    level:"synthetic",grades:"4",language:"en",
  };
}
const base:ExamProfile = {
  id:"test-math-legacy", name:"Synthetic math scoring tests",grades:"4",durationSeconds:1200,
  questionCount:3,initialScore:0,maxScore:15,wrongPenaltyMode:"fixed",wrongPenaltyValue:0,
};
function run(name:string, patch:Partial<ExamProfile>, answers:Record<string,string>, qs:Question[]) {
  const profile={...base,...patch,questionCount:qs.length};
  const bundle:ExamBundle={profile,questions:qs};
  const old = gradeExam(qs,answers,profile);
  const {grade,receipt}=gradeMathWithParityReceipt(bundle,answers);
  assert.deepEqual(grade,old,`${name}: adapter may not change grader output`);
  assert.equal(receipt.gradeScore,old.score);
  assert.equal(receipt.parity,true);
  assert.equal(receipt.initialScore,profile.initialScore);
}
const questions=[question("q-001",1,5,"A"),question("q-002",2,5,"B"),question("q-003",3,5,"12","integer")];
run("fixed scoring",{maxScore:15,competitionId:"australian-amc"},
  {"q-001":"A","q-002":"C","q-003":"012"},questions);
run("legacy kangaroo initial and penalty",
  {maxScore:25,initialScore:10,wrongPenaltyMode:"quarter-points",wrongPenaltyValue:0.25,competitionId:"kangaroo"},
  {"q-001":"A","q-002":"C"},questions);
run("MAA blank award",{maxScore:18,blankScoreValue:1.5,competitionId:"maa-amc",formatId:"maa-amc10"},
  {"q-001":"A","q-002":"C"},questions.map(q=>({...q,points:6})));
const corrupt:ExamBundle={profile:{...base,questionCount:4},questions};
assert.throws(()=>gradeMathWithParityReceipt(corrupt,{}),/item-count-mismatch/);
assert.throws(()=>gradeMathWithParityReceipt({profile:base,questions}, {"extraneous":"B"}),/unknown-math-answer/);
console.log("ASSESSMENT_MATH_BRIDGE=PASS (legacy score parity: AMC, Kangaroo, MAA; invalid input blocked)");
