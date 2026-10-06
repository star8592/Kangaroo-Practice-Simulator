import assert from "node:assert/strict";
import { assessArithmeticAnswer,normalizeArithmeticInput,mathInputKeys } from "../src/lib/arithmetic-input";

assert.equal(normalizeArithmeticInput("３／４"),"3/4");
assert.equal(normalizeArithmeticInput("2根号3"),"2√3");
assert.equal(normalizeArithmeticInput("x平方＋2x＋1"),"x^2+2x+1");
assert.equal(normalizeArithmeticInput("x²−9"),"x^2-9");
assert.equal(normalizeArithmeticInput("6÷8"),"6/8");

assert.deepEqual(assessArithmeticAnswer({answer:"3/4",answerKind:"fraction",requireSimplified:true},"6/8"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"2√3",answerKind:"radical",requireSimplified:true},"√12"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"x^2+5x+6",answerKind:"expression"},"(x+2)(x+3)"),{status:"correct"});
assert.deepEqual(assessArithmeticAnswer({answer:"x^2+2x+1",answerKind:"expression"},"x平方+2x+1"),{status:"correct"});
assert(mathInputKeys("fraction").some(x=>x.insert==="/"));
assert(mathInputKeys("radical").some(x=>x.insert==="√"));
assert(mathInputKeys("expression").some(x=>x.insert==="^2"));
console.log("arithmetic structured input: PASS");
