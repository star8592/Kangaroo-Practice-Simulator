import assert from "node:assert/strict";
import { formatArithmeticDisplay } from "../src/lib/arithmetic-display";

assert.equal(formatArithmeticDisplay("2^4 = ?"),"2⁴ = ?");
assert.equal(formatArithmeticDisplay("x^2 + 3x + 1"),"x² + 3x + 1");
assert.equal(formatArithmeticDisplay("log_2(8) = ?"),"log₂(8) = ?");
assert.equal(formatArithmeticDisplay("等差数列 a₁=3，d=2，a10 = ?"),"等差数列 a₁=3，d=2，a₁₀ = ?");
assert.equal(formatArithmeticDisplay("S15 = ?"),"S₁₅ = ?");
assert.equal(formatArithmeticDisplay("C(10,3) = ?"),"C₁₀³ = ?");
assert.equal(formatArithmeticDisplay("3/4 + 1/4 = ?"),"3⁄4 + 1⁄4 = ?");
assert.equal(formatArithmeticDisplay("sqrt(49) <= 8"),"√(49) ≤ 8");
console.log("arithmetic display typography: PASS");
