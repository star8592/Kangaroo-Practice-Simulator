import assert from "node:assert/strict";
import { coachingSteps } from "../src/lib/arithmetic-coaching";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";
const item=(prompt:string,strategy:ArithmeticItem["strategy"],grade:ArithmeticItem["grade"]=4):ArithmeticItem=>({id:"coach",grade,skillId:"laws",prompt,answer:0,strategy,expectedMs:6000,difficulty:3,meta:{}});
for(const x of [item("26 × 3 = ?","distributive",3),item("38 × 17 = ?","distributive"),item("48 × 99 = ?","compensation"),item("25 × 36 = ?","friendly_25_50_125"),item("68 + 29 = ?","compensation")])assert.equal(coachingSteps(x).length,1);
assert.equal(coachingSteps(item("26 × 3 = ?","distributive",3))[0].text,"26 = 20 + 6 → 20×3 + 6×3");
assert.match(coachingSteps(item("48 × 99 = ?","compensation"))[0].text,/99 = 100/);
assert(!coachingSteps(item("26 × 3 = ?","distributive",3))[0].text.includes("提示"));
console.log("arithmetic coaching direct hint: PASS");
