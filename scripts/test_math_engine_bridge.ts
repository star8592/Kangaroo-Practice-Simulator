import assert from "node:assert/strict";
import { arithmeticAttemptToSignal,arithmeticItemToEntity,buildLearnerProfile,buildStructureDiscoveryTask,strategiesFor } from "../src/lib/math-engine";
import type { ArithmeticAttempt } from "../src/lib/arithmetic-analytics";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";
const item:ArithmeticItem={id:"bridge",grade:4,skillId:"laws",prompt:"37 × 99 = ?",answer:3663,strategy:"compensation",strategyNode:"mul_compensation",expectedMs:6500,difficulty:3,meta:{}};
const entity=arithmeticItemToEntity(item);assert.equal(entity.domain,"arithmetic");assert(strategiesFor(entity).some(x=>x.id==="round_compensation"));
const attempt:ArithmeticAttempt={item,answer:"3663",numericAnswer:3663,correct:true,presentedAt:0,firstInputAt:3000,submittedAt:3400,firstInputMs:3000,entryMs:400,responseMs:3400,edits:0,backspaces:0,reason:"correct",telemetryVersion:3};
const signal=arithmeticAttemptToSignal(attempt);assert.equal(signal.grade,4);assert.equal(signal.stage,"automatic");assert.equal(signal.efficient,true);assert(signal.transformations.includes("compensate"));
entity.representations.push({id:"bridge-r2",kind:"numeric",form:"37×(100-1)",purpose:"看见整百补偿"});
const task=buildStructureDiscoveryTask(entity);assert(task.choices.some(x=>x.label.replace(/\s/g,"").includes("100−1")));assert(!task.choices.some(x=>x.label===entity.canonical));assert(task.choices.some(x=>x.preferred)&&task.choices.some(x=>!x.preferred));assert(task.strategyIds.includes("round_compensation"));
const profile=buildLearnerProfile([signal,{...signal,stage:"assisted",hintLevel:2}]);assert.equal(profile.independence.score,50);assert.equal(profile.hintReliance.score,50);

const division:ArithmeticItem={id:"div-102-6",grade:3,skillId:"division",prompt:"102 ÷ 6 = ?",answer:17,strategy:"split",strategyNode:"split_place",expectedMs:6000,difficulty:2,meta:{}};
const divisionEntity=arithmeticItemToEntity(division);const divisionTask=buildStructureDiscoveryTask(divisionEntity);assert(divisionTask.choices.length>=2);assert(divisionTask.choices.some(x=>x.preferred&&x.label.includes("60")&&x.label.includes("42")));
console.log("math engine arithmetic bridge: PASS");
