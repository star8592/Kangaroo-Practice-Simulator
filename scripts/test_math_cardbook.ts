import assert from "node:assert/strict";
import type { ExamAttemptRecord } from "../src/lib/attempt-store";
import { buildCardbookGoal, buildCardbookStats, buildExamCardResultState, buildMathCards } from "../src/lib/math-cardbook";

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
const attemptsForState=[
  attempt("a1","paper-a",60,100,1000),
  attempt("a2","paper-a",85,100,2000),
  attempt("a3","paper-a",80,100,3000),
  attempt("p1","practice-a",100,100,4000,"practice"),
];

const firstState=buildExamCardResultState(attemptsForState,"a1");
assert(firstState);
assert.equal(firstState.state,"new");
assert.equal(firstState.previousBestPercent,undefined);
assert.equal(firstState.rarityAfter,"普通");
assert.equal(firstState.nextTargetPercent,70);

const upgradeState=buildExamCardResultState(attemptsForState,"a2");
assert(upgradeState);
assert.equal(upgradeState.state,"upgrade");
assert.equal(upgradeState.previousBestPercent,60);
assert.equal(upgradeState.bestPercent,85);
assert.equal(upgradeState.rarityBefore,"普通");
assert.equal(upgradeState.rarityAfter,"超稀有");
assert.equal(upgradeState.rarityUpgraded,true);
assert.equal(upgradeState.nextTargetPercent,90);
assert.equal(upgradeState.nextTargetRarity,"传说");

const completeState=buildExamCardResultState(attemptsForState,"a3");
assert(completeState);
assert.equal(completeState.state,"complete");
assert.equal(completeState.previousBestPercent,85);
assert.equal(completeState.currentPercent,80);
assert.equal(completeState.bestPercent,85);
assert.equal(completeState.bestScore,85);
assert.equal(completeState.rarityAfter,"超稀有");
assert.equal(completeState.rarityUpgraded,false);


const competitionCards=cards.filter(card=>card.kind==="竞赛卡");
const achievementCards=cards.filter(card=>card.kind==="成就卡");

assert.equal(competitionCards.length,1,"same formal paper should keep one collectible challenge card");
assert.equal(competitionCards[0].score,85,"best score should upgrade the existing card");
assert.equal(competitionCards[0].rarity,"超稀有");
assert.equal(competitionCards[0].id,"exam:paper-a");
assert.equal(competitionCards[0].subtitleEn,"Math Kangaroo");

assert.equal(achievementCards.length,1,"first formal attempt should unlock one achievement");
assert.equal(achievementCards[0].id,"achievement:first-formal");
assert.equal(achievementCards[0].completedAt,1000);
assert.equal(achievementCards[0].titleEn,"First Challenge");

const stats=buildCardbookStats(cards);
assert.deepEqual(stats,{total:2,competition:1,achievements:1,mythic:0});

const upgrade=buildCardbookGoal(cards);
assert.equal(upgrade.mode,"upgrade");
assert.equal(upgrade.currentPercent,85);
assert.equal(upgrade.targetPercent,90);
assert.equal(upgrade.targetRarity,"传说");
assert.equal(upgrade.examId,"paper-a");

const perfectCards=buildMathCards([attempt("m1","paper-m",100,100,5000)]);
assert.equal(perfectCards.filter(card=>card.kind==="成就卡").length,2,"perfect first challenge should unlock both achievements");
assert(perfectCards.some(card=>card.id==="achievement:first-perfect"&&card.rarity==="神话"));
assert.deepEqual(buildCardbookStats(perfectCards),{total:3,competition:1,achievements:2,mythic:2});

const collect=buildCardbookGoal(perfectCards);
assert.equal(collect.mode,"collect");
assert.equal(collect.currentPercent,100);
assert.equal(collect.targetPercent,undefined);

const first=buildCardbookGoal([]);
assert.deepEqual(first,{mode:"first",currentPercent:0});

console.log("math cardbook progression: PASS");
