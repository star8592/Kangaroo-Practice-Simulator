import assert from "node:assert/strict";
import type { ExamAttemptRecord } from "../src/lib/attempt-store";
import { buildCardbookGoal, buildMathCards } from "../src/lib/math-cardbook";

function attempt(id:string,examId:string,score:number,maxScore:number,submittedAt:number,paperType="competition"):ExamAttemptRecord{
  return {
    id,userId:"u1",candidateNo:"c1",examId,
    profile:{name:examId,grades:"1",questionCount:10,maxScore,competitionId:"kangaroo",paperType},
    startedAt:submittedAt-1000,submittedAt,elapsedSeconds:60,
    grade:{score,maxScore} as ExamAttemptRecord["grade"],
    questions:[],events:[],
  };
}

const cards=buildMathCards([
  attempt("a1","paper-a",60,100,1000),
  attempt("a2","paper-a",85,100,2000),
  attempt("a3","paper-a",80,100,3000),
  attempt("p1","practice-a",100,100,4000,"practice"),
]);

assert.equal(cards.length,1,"same formal paper should keep one collectible card");
assert.equal(cards[0].score,85,"best score should upgrade the existing card");
assert.equal(cards[0].rarity,"超稀有");
assert.equal(cards[0].id,"exam:paper-a");

const upgrade=buildCardbookGoal(cards);
assert.equal(upgrade.mode,"upgrade");
assert.equal(upgrade.currentPercent,85);
assert.equal(upgrade.targetPercent,90);
assert.equal(upgrade.targetRarity,"传说");
assert.equal(upgrade.examId,"paper-a");

const mythic=buildMathCards([attempt("m1","paper-m",97,100,5000)]);
const collect=buildCardbookGoal(mythic);
assert.equal(collect.mode,"collect");
assert.equal(collect.currentPercent,97);
assert.equal(collect.targetPercent,undefined);

const first=buildCardbookGoal([]);
assert.deepEqual(first,{mode:"first",currentPercent:0});

console.log("math cardbook progression: PASS");
