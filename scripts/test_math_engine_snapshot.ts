import assert from "node:assert/strict";
import { buildMathEngineSnapshot } from "../src/lib/math-engine";
import type { ArithmeticAttempt, ArithmeticSession } from "../src/lib/arithmetic-analytics";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";

const item: ArithmeticItem = {id:"snap",grade:4,skillId:"laws",prompt:"37 × 99 = ?",answer:3663,strategy:"compensation",strategyNode:"mul_compensation",expectedMs:6500,difficulty:3,meta:{}};
const attempt: ArithmeticAttempt = {item,answer:"3663",numericAnswer:3663,correct:true,presentedAt:0,firstInputAt:3000,submittedAt:3400,firstInputMs:3000,entryMs:400,responseMs:3400,edits:0,backspaces:0,reason:"correct",telemetryVersion:3};
const session: ArithmeticSession = {id:"s1",studentId:"u1",grade:4,mode:"adaptive",startedAt:0,finishedAt:4000,attempts:[attempt]};
const snapshot = buildMathEngineSnapshot([session],"discovery");
assert.equal(snapshot.version,1);
assert.equal(snapshot.evidence.sessions,1);
assert.equal(snapshot.evidence.attempts,1);
assert(snapshot.evidence.observed>=1);
assert(snapshot.evidence.inferred>=1);
assert.equal(snapshot.policyDecision.policy,"discovery");
assert(snapshot.cognition.some((x)=>x.primitive==="execute"&&x.observedAttempts===1));
console.log("math engine snapshot: PASS");
