import assert from "node:assert/strict";
import { mathVerificationForQuestion, verifiedMathCount, verifiedMathItems } from "../src/lib/math-verification";

assert.equal(verifiedMathCount, 16, "verified index count must match committed Lean results");
assert.equal(verifiedMathItems().length, 16);
const q20=mathVerificationForQuestion("maa-amc10-2022-a-sample-q20");
assert(q20, "Q20 must be present in verification registry");
assert.equal(q20.status,"verified");
assert.equal(q20.method,"lean");
assert.match(q20.sourceSha256||"",/^[0-9a-f]{64}$/);
assert.equal(mathVerificationForQuestion("maa-amc10-2022-a-sample-q01"),undefined,"unverified questions must not receive a formal badge");
console.log("math verification registry: PASS (16 verified, negative control clean)");
