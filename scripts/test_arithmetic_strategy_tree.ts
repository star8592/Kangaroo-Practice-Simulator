import assert from "node:assert/strict";
import { buildTrainingPlan, type ArithmeticAttempt, type ArithmeticSession } from "../src/lib/arithmetic-analytics";
import { generateArithmeticSet, type ArithmeticItem } from "../src/lib/arithmetic-generator";
import type { CleverNode } from "../src/lib/arithmetic";

function attempt(i:number,node:CleverNode,ms:number,correct=true):ArithmeticAttempt {
  const compensation=node==="add_compensation";
  const item:ArithmeticItem={
    id:`t${i}`,grade:2,skillId:compensation?"add100":"times",
    prompt:compensation?"38 + 29 = ?":"7 × 8 = ?",
    answer:compensation?67:56,
    strategy:compensation?"compensation":"fact_recall",
    strategyNode:node,expectedMs:compensation?5000:3000,difficulty:2,meta:{}
  };
  const answer=correct?item.answer:item.answer+1;
  return {item,answer:String(answer),numericAnswer:answer,correct,
    presentedAt:0,firstInputAt:ms,submittedAt:ms+400,
    firstInputMs:ms,entryMs:400,responseMs:ms+400,
    edits:0,backspaces:0,reason:correct?"correct":"unknown",telemetryVersion:3};
}

function makeSession(attempts:ArithmeticAttempt[]):ArithmeticSession {
  return {id:"strategy-regression",studentId:"test",grade:2,mode:"adaptive",startedAt:1,finishedAt:2,attempts};
}
const history=[
  ...Array.from({length:6},(_,i)=>attempt(i,"add_compensation",7000,true)),
  ...Array.from({length:8},(_,i)=>attempt(i+10,"fact_recall",1800,true)),
];
const plan=buildTrainingPlan(2,[makeSession(history)]);
assert.deepEqual(plan.focusNodes,["add_compensation"]);
const node=plan.nodeMetrics.find(x=>x.node==="add_compensation");
assert(node);
assert.equal(node.status,"needs_fluency");
assert.equal(node.correct,6);
assert.equal(node.attempts,6);

const generated=generateArithmeticSet(2,12,8592,plan.focusSkills,false,plan.focusNodes);
const targeted=generated.filter(x=>x.strategyNode==="add_compensation");
assert(targeted.length>=8,`expected >=8 targeted items, got ${targeted.length}`);
assert(targeted.every(x=>/\+ (19|29|39) = \?/.test(x.prompt)));
assert.equal(new Set(generated.map(x=>x.id)).size,generated.length);

const legacy=Array.from({length:5},(_,i)=>{
  const a=attempt(i,"add_compensation",6800,true);
  const {strategyNode,...item}=a.item;
  void strategyNode;
  return {...a,item};
});
const legacyPlan=buildTrainingPlan(2,[makeSession(legacy)]);
assert(legacyPlan.nodeMetrics.some(x=>x.node==="add_compensation"));
console.log("arithmetic strategy tree regression: PASS");
