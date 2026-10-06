import assert from "node:assert/strict";
import { buildArithmeticMilestone, type ArithmeticAttempt, type ArithmeticSession } from "../src/lib/arithmetic-analytics";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";

let attemptCounter=0;\nfunction makeAttempt(skillId:string,correct:boolean,ms=600):ArithmeticAttempt{
  const item:ArithmeticItem={
    id:"item-"+(++attemptCounter),
    grade:2,
    skillId,
    prompt:"38 + 29 = ?",
    answer:67,
    strategy:"compensation",
    strategyNode:"add_compensation",
    expectedMs:5000,
    difficulty:2,
    meta:{},
  };
  return {
    item,
    answer:correct?"67":"66",
    numericAnswer:correct?67:66,
    correct,
    presentedAt:0,
    firstInputAt:ms,
    submittedAt:ms+200,
    firstInputMs:ms,
    entryMs:200,
    responseMs:ms+200,
    edits:0,
    backspaces:0,
    reason:correct?"correct":"unknown",
    telemetryVersion:3,
  };
}

let counter=0;
function session(attempts:ArithmeticAttempt[],finishedAt:number):ArithmeticSession{
  counter++;
  return {
    id:"m-"+counter,
    studentId:"u1",
    grade:2,
    mode:"adaptive",
    startedAt:finishedAt-1000,
    finishedAt,
    attempts,
  };
}

const imperfect=session([
  ...Array.from({length:18},()=>makeAttempt("add100",true)),
  ...Array.from({length:2},()=>makeAttempt("add100",false)),
],1000);
const perfect=session(Array.from({length:20},()=>makeAttempt("add100",true)),2000);
const perfectMilestone=buildArithmeticMilestone(2,[imperfect],perfect);
assert(perfectMilestone);
assert.equal(perfectMilestone.code,"first_perfect_set");
assert.equal(perfectMilestone.accuracy,1);

const priorBest=session([
  ...Array.from({length:10},()=>makeAttempt("add100",true)),
  ...Array.from({length:2},()=>makeAttempt("add100",false)),
],3000);
const improved=session([
  ...Array.from({length:11},()=>makeAttempt("add100",true)),
  makeAttempt("add100",false),
],4000);
const bestMilestone=buildArithmeticMilestone(2,[priorBest],improved);
assert(bestMilestone);
assert.equal(bestMilestone.code,"accuracy_personal_best");
assert((bestMilestone.improvementPoints||0)>=5);

const weak=session([
  makeAttempt("add100",true),
  makeAttempt("add100",false),
  makeAttempt("add100",false),
  makeAttempt("add100",true),
],5000);
const recoveredOnce=session(Array.from({length:3},()=>makeAttempt("add100",true,500)),6000);
const recoveredTwice=session(Array.from({length:3},()=>makeAttempt("add100",true,500)),7000);
const recoveryMilestone=buildArithmeticMilestone(2,[weak,recoveredOnce],recoveredTwice);
assert(recoveryMilestone);
assert.equal(recoveryMilestone.code,"skill_stable_recovery");
assert.equal(recoveryMilestone.skillId,"add100");

const flatPrior=session([
  ...Array.from({length:11},()=>makeAttempt("add100",true)),
  makeAttempt("add100",false),
],8000);
const flatCurrent=session([
  ...Array.from({length:11},()=>makeAttempt("add100",true)),
  makeAttempt("add100",false),
],9000);
assert.equal(buildArithmeticMilestone(2,[flatPrior],flatCurrent),null);

console.log("arithmetic milestones: PASS");
