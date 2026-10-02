import assert from "node:assert/strict";
import { coachingSteps } from "../src/lib/arithmetic-coaching";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";

const item=(prompt:string,strategy:ArithmeticItem["strategy"],grade:ArithmeticItem["grade"]=4):ArithmeticItem=>({id:"coach",grade,skillId:"laws",prompt,answer:0,strategy,expectedMs:6000,difficulty:3,meta:{}});
const easy=coachingSteps(item("26 × 3 = ?","distributive",3));
assert.equal(easy.length,1);assert.match(easy[0].text,/26/);assert.match(easy[0].text,/20/);assert.match(easy[0].text,/6/);assert.match(easy[0].text,/20 × 3/);assert.match(easy[0].text,/6 × 3/);
const harder=coachingSteps(item("38 × 17 = ?","distributive",4));
assert.equal(harder.length,2);assert(harder.every(s=>s.text.length>8));
for(const x of [item("48 × 99 = ?","compensation"),item("25 × 36 = ?","friendly_25_50_125"),item("68 + 29 = ?","compensation")]){
 const steps=coachingSteps(x);assert(steps.length>=1&&steps.length<=2);assert.deepEqual(steps.map((s,i)=>s.level),steps.map((_,i)=>i+1));
}
assert(!coachingSteps(item("26 × 3 = ?","distributive",3)).some(s=>/把 3 拆/.test(s.text)));
console.log("arithmetic coaching adaptive depth: PASS");
