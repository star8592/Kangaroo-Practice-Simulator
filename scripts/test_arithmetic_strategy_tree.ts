import assert from "node:assert/strict";
import { buildTrainingPlan, type ArithmeticAttempt, type ArithmeticSession } from "../src/lib/arithmetic-analytics";
import { generateArithmeticSet, generateDiagnosticSet, type ArithmeticItem } from "../src/lib/arithmetic-generator";
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


const diagnostic=generateDiagnosticSet(2,20,24680);
assert.equal(diagnostic.length,20);
const skillCounts=Object.fromEntries(["add100","sub100","times","divide"].map(skill=>[skill,diagnostic.filter(x=>x.skillId===skill).length]));
assert.deepEqual(skillCounts,{add100:5,sub100:5,times:5,divide:5});
const families=new Set(diagnostic.map(x=>x.meta.probeFamily).filter((x):x is string=>typeof x==="string"));
assert.equal(families.size,4);
const probeAttempts=diagnostic.map((item)=>{
  const role=item.meta.probeRole;const node=item.meta.probeNode;
  const slow=role==="strategy"&&node==="add_compensation";
  const ms=slow?6500:2200;
  const answer=item.answer;
  return {item,answer:String(answer),numericAnswer:answer,correct:true,presentedAt:0,firstInputAt:ms,submittedAt:ms+300,firstInputMs:ms,entryMs:300,responseMs:ms+300,edits:0,backspaces:0,reason:"correct" as const,telemetryVersion:3 as const};
});
const probePlan=buildTrainingPlan(2,[{id:"probe",studentId:"test",grade:2,mode:"diagnostic",startedAt:1,finishedAt:2,attempts:probeAttempts}]);
const addProbe=probePlan.probeMetrics.find(x=>x.node==="add_compensation");
assert(addProbe);
assert.equal(addProbe.status,"strategy_gap");
assert(probePlan.focusNodes.includes("add_compensation"));


for(let grade=1;grade<=6;grade++){
  for(let seed=1;seed<=50;seed++){
    const xs=generateDiagnosticSet(grade as 1|2|3|4|5|6,20,seed);
    assert.equal(xs.length,20);
    assert(xs.every(x=>Number.isFinite(x.answer)));
  }
}

console.log("arithmetic strategy tree regression: PASS");
