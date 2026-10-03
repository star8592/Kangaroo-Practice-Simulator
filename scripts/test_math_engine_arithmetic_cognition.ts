import assert from "node:assert/strict";
import {
  arithmeticAttemptToCognitiveObservations,
  arithmeticSessionsToCognitiveObservations,
  chooseTeachingPolicy,
  summarizeCognition,
} from "../src/lib/math-engine";
import type { ArithmeticAttempt, ArithmeticSession } from "../src/lib/arithmetic-analytics";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";

const item: ArithmeticItem = {id:"cog",grade:4,skillId:"laws",prompt:"37 × 99 = ?",answer:3663,strategy:"compensation",strategyNode:"mul_compensation",expectedMs:6500,difficulty:3,meta:{}};
const attempt: ArithmeticAttempt = {item,answer:"3663",numericAnswer:3663,correct:true,presentedAt:0,firstInputAt:3000,submittedAt:3400,firstInputMs:3000,entryMs:400,responseMs:3400,edits:0,backspaces:0,reason:"correct",telemetryVersion:3};
const observations = arithmeticAttemptToCognitiveObservations(attempt);
assert(observations.some((x)=>x.primitive==="execute"&&x.source==="observed"&&x.confidence===1));
assert(observations.some((x)=>x.primitive==="perceive"&&x.source==="inferred"));
assert(observations.some((x)=>x.primitive==="transform"&&x.source==="inferred"));

const session: ArithmeticSession = {id:"s1",grade:4,mode:"adaptive",startedAt:0,finishedAt:4000,attempts:[attempt]};
assert.equal(arithmeticSessionsToCognitiveObservations([session]).length, observations.length);
const summary = summarizeCognition(observations);
const execute = summary.find((x)=>x.primitive==="execute");
assert.equal(execute?.observedAttempts,1);
assert.equal(execute?.meanConfidence,100);
assert.equal(chooseTeachingPolicy(summary,"discovery").policy,"discovery");
console.log("math engine arithmetic cognition bridge: PASS");
