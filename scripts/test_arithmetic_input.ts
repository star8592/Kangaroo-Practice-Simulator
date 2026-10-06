import assert from "node:assert/strict";
import { assessArithmeticAnswer,normalizeArithmeticInput,mathInputKeys } from "../src/lib/arithmetic-input";

assert.equal(normalizeArithmeticInput("３／４"),"3/4");
assert.equal(normalizeArithmeticInput("2根号3"),"2√3");
assert.equal(normalizeArithmeticInput("x平方＋2x＋1"),"x^2+2x+1");
assert.equal(normalizeArithmeticInput("x²−9"),"x^2-9");
assert.equal(normalizeArithmeticInput("6÷8"),"6/8");
assert.equal(normalizeArithmeticInput("3PI/4"),"3π/4");
assert.equal(normalizeArithmeticInput("pi/6"),"π/6");
assert.equal(normalizeArithmeticInput("ＰＩ／６"),"π/6");

assert.deepEqual(assessArithmeticAnswer({answer:"3/4",answerKind:"fraction",requireSimplified:true},"6/8"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"1/2",answerKind:"fraction",requireSimplified:true},"0.5"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"π/6",answerKind:"pi",requireSimplified:true},"2π/12"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"π/2",answerKind:"pi",requireSimplified:true},"0.5π"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"3π/4",answerKind:"pi",requireSimplified:true},"3pi/4"),{status:"correct"});
assert.deepEqual(assessArithmeticAnswer({answer:"2√3",answerKind:"radical",requireSimplified:true},"√12"),{status:"needs_simplification"});
assert.deepEqual(assessArithmeticAnswer({answer:"x^2+5x+6",answerKind:"expression"},"(x+2)(x+3)"),{status:"correct"});
assert.deepEqual(assessArithmeticAnswer({answer:"x^2+2x+1",answerKind:"expression"},"x平方+2x+1"),{status:"correct"});
assert(mathInputKeys("fraction").some(x=>x.insert==="/"));
assert(mathInputKeys("radical").some(x=>x.insert==="√"));
assert(mathInputKeys("pi").some(x=>x.insert==="π"));
assert(mathInputKeys("expression").some(x=>x.insert==="^2"));
console.log("arithmetic structured input: PASS");
