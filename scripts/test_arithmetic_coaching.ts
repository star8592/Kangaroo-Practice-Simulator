import assert from "node:assert/strict";
import { coachingSteps } from "../src/lib/arithmetic-coaching";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";

const item=(prompt:string,strategy:ArithmeticItem["strategy"]):ArithmeticItem=>({id:"coach",grade:4,skillId:"laws",prompt,answer:0,strategy,expectedMs:6000,difficulty:3,meta:{}});
for(const x of [item("48 × 99 = ?","compensation"),item("25 × 36 = ?","friendly_25_50_125"),item("38 × 17 = ?","distributive"),item("68 + 29 = ?","compensation")]){
 const steps=coachingSteps(x);assert.equal(steps.length,3);assert.deepEqual(steps.map(s=>s.level),[1,2,3]);assert(steps.every(s=>s.text.length>6));
}
assert.match(coachingSteps(item("48 × 99 = ?","compensation"))[2].text,/100/);
console.log("arithmetic coaching ladder: PASS");
