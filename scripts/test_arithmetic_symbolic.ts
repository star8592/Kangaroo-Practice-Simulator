import assert from "node:assert/strict";
import { isEquivalentArithmeticAnswer,numericAnswerValue } from "../src/lib/arithmetic-answer";

assert.equal(numericAnswerValue("3/4"),.75);
assert.equal(isEquivalentArithmeticAnswer({answer:.75,answerKind:"number"},"3/4"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"3/4",answerKind:"fraction"},"6/8"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"3/4",answerKind:"fraction",requireSimplified:true},"6/8"),false);
assert.equal(isEquivalentArithmeticAnswer({answer:"3/4",answerKind:"fraction",requireSimplified:true},"3/4"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"2√3",answerKind:"radical"},"sqrt(12)"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"2√3",answerKind:"radical",requireSimplified:true},"√12"),false);
assert.equal(isEquivalentArithmeticAnswer({answer:"2√3",answerKind:"radical",requireSimplified:true},"2sqrt(3)"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"√3/2",answerKind:"radical",requireSimplified:true},"sqrt(3)/2"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"√3/2",answerKind:"radical",requireSimplified:true},"√12/4"),false);
assert.equal(isEquivalentArithmeticAnswer({answer:"5x+12",answerKind:"expression"},"3(x+4)+2x"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"x^2+5x+6",answerKind:"expression"},"(x+2)(x+3)"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"x^2-9",answerKind:"expression"},"(x-3)(x+3)"),true);
assert.equal(isEquivalentArithmeticAnswer({answer:"2x+1",answerKind:"expression"},"2x-1"),false);
console.log("arithmetic symbolic answers: PASS");

import { generateArithmeticSet } from "../src/lib/arithmetic-generator";
import { finalizeAttempt } from "../src/lib/arithmetic-analytics";

let symbolicCount=0;
for(const grade of [7,8,9] as const){
 for(let seed=1;seed<=40;seed++)symbolicCount+=generateArithmeticSet(grade,24,seed).filter(x=>x.answerKind&&x.answerKind!=="number").length;
}
assert(symbolicCount>100,`expected broad symbolic coverage, got ${symbolicCount}`);
const expressionItem=generateArithmeticSet(7,80,8592).find(x=>x.answerKind==="expression");
assert(expressionItem,"grade 7 should generate expression answers");
const expressionAttempt=finalizeAttempt(expressionItem,String(expressionItem.answer),{presentedAt:0,firstInputAt:1000,submittedAt:2500,edits:0,backspaces:0});
assert.equal(expressionAttempt.correct,true);
const radicalItem=generateArithmeticSet(9,80,8592).find(x=>x.answerKind==="radical");
assert(radicalItem,"grade 9 should generate simplified radical answers");
const radicalAttempt=finalizeAttempt(radicalItem,String(radicalItem.answer),{presentedAt:0,firstInputAt:1000,submittedAt:2500,edits:0,backspaces:0});
assert.equal(radicalAttempt.correct,true);
console.log(`arithmetic symbolic generation: PASS symbolic=${symbolicCount}`);
