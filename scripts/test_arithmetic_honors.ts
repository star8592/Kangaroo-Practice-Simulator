import assert from "node:assert/strict";
import { buildArithmeticHonorCards } from "../src/lib/arithmetic-honors";
import type { ArithmeticAttempt, ArithmeticSession } from "../src/lib/arithmetic-analytics";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";

let attemptId=0;
let sessionId=0;

function attempt(skillId:string,correct:boolean,ms=500):ArithmeticAttempt{
  const item:ArithmeticItem={
    id:"honor-item-"+(++attemptId),
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

function session(attempts:ArithmeticAttempt[],finishedAt:number):ArithmeticSession{
  return {
    id:"honor-session-"+(++sessionId),
    studentId:"u1",
    grade:2,
    mode:"adaptive",
    startedAt:finishedAt-1000,
    finishedAt,
    attempts,
  };
}

const weak=session([
  attempt("add100",true),
  attempt("add100",false),
  attempt("add100",false),
  attempt("add100",true),
],1000);

const best83=session([
  ...Array.from({length:10},()=>attempt("add100",true)),
  ...Array.from({length:2},()=>attempt("add100",false)),
],2000);

const stable1=session(Array.from({length:3},()=>attempt("add100",true,500)),3000);
const stable2=session(Array.from({length:3},()=>attempt("add100",true,500)),4000);

const best92=session([
  ...Array.from({length:11},()=>attempt("add100",true)),
  attempt("add100",false),
],5000);

const perfect=session(Array.from({length:20},()=>attempt("add100",true,400)),6000);
const perfectAgain=session(Array.from({length:20},()=>attempt("add100",true,350)),7000);

const cards=buildArithmeticHonorCards([weak,best83,stable1,stable2,best92,perfect,perfectAgain]);

assert.equal(cards.filter(card=>card.id==="achievement:arithmetic-perfect:g2").length,1);
assert.equal(cards.filter(card=>card.id==="achievement:arithmetic-best:g2").length,1);
assert.equal(cards.filter(card=>card.id==="achievement:arithmetic-stable:g2:add100").length,1);

const best=cards.find(card=>card.id==="achievement:arithmetic-best:g2");
assert(best);
assert(best.subtitle.includes("92%"));
assert.equal(best.href,"/arithmetic");

const perfectCard=cards.find(card=>card.id==="achievement:arithmetic-perfect:g2");
assert(perfectCard);
assert.equal(perfectCard.rarity,"神话");

const stable=cards.find(card=>card.id==="achievement:arithmetic-stable:g2:add100");
assert(stable);
assert.equal(stable.rarity,"超稀有");

assert(cards.every(card=>card.kind==="成就卡"));
console.log("persistent arithmetic honors: PASS");
