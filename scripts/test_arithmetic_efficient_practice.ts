import assert from "node:assert/strict";
import { adaptiveStopDecision, baselineQuestionCount, makeDistinctRepair } from "../src/lib/arithmetic-efficient-practice";
import { GRADE_PROFILES, type ArithmeticGrade } from "../src/lib/arithmetic";
import type { ArithmeticAttempt } from "../src/lib/arithmetic-analytics";
import { generateDiagnosticSet, type ArithmeticItem } from "../src/lib/arithmetic-generator";

const item = (skillId: string, n: number): ArithmeticItem => ({
  id: String(n), grade: 2, skillId, prompt: `${n}+2=?`, answer: n + 2,
  strategy: "fact_recall", expectedMs: 4000, difficulty: 1, meta: {},
});
const attempt = (skillId: string, n: number, correct = true, reason: ArithmeticAttempt["reason"] = correct ? "correct" : "fact_gap"): ArithmeticAttempt => ({
  item: item(skillId, n), answer: String(n + 2), numericAnswer: n + 2, correct,
  presentedAt: n * 1000, firstInputAt: n * 1000 + 100,
  submittedAt: n * 1000 + 500, firstInputMs: 100, entryMs: 400,
  responseMs: 500, edits: 0, backspaces: 0, reason,
});
const clean = Array.from({ length: 8 }, (_, i) => attempt(i % 2 ? "times" : "add100", i));
assert.equal(adaptiveStopDecision(clean.slice(0, 7), []).stop, false, "never stop before minimum evidence");
assert.equal(adaptiveStopDecision(clean, []).stop, true, "clean and varied evidence can save questions");
assert.equal(adaptiveStopDecision(clean, ["divide"]).stop, false, "unseen focus skill must be checked");
assert.equal(adaptiveStopDecision(Array.from({ length: 8 }, (_, i) => attempt("times", i)), []).stop, false, "one type is not broad mastery");
assert.equal(adaptiveStopDecision([...clean.slice(0, 2), attempt("times", 8, false), ...clean.slice(2)], []).stop, true, "an error can be resolved with later clean observations");
assert.equal(adaptiveStopDecision([...clean.slice(0, 6), attempt("times", 8, false), ...clean.slice(6)], []).stop, false, "recent error still needs repair");
assert.equal(adaptiveStopDecision([...clean.slice(0, 7), attempt("times", 7, true, "slow_recall")], []).stop, false, "slow recall is not stable fluency");
for (const grade of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as ArithmeticGrade[]) {
  assert.equal(baselineQuestionCount(grade), grade === 1 ? 12 : 16, `minimum four items per G${grade} skill`);
  const baseline = generateDiagnosticSet(grade, baselineQuestionCount(grade), 1324);
  assert.equal(baseline.length, baselineQuestionCount(grade));
  for (const skill of GRADE_PROFILES[grade].skills) assert.ok(baseline.filter(q => q.skillId === skill.id).length >= 4, `G${grade} ${skill.id}: balanced diagnostic coverage`);
  for (const skill of GRADE_PROFILES[grade].skills) {
    const repair = makeDistinctRepair(grade, skill.id, 12023, new Set(["999 + 999 = ?"]), skill.targetMs);
    assert.ok(repair, `repair exists for G${grade} ${skill.id}`);
    assert.equal(repair.skillId, skill.id, `repair must match G${grade} ${skill.id}`);
    assert.equal(repair.expectedMs, skill.targetMs);
    const different = makeDistinctRepair(grade, skill.id, 12023, new Set([repair.prompt]), skill.targetMs);
    assert.ok(different && different.prompt !== repair.prompt, `avoid same prompt in G${grade} ${skill.id}`);
  }
}
console.log("arithmetic-efficient-practice: all checkpoints and G1–G12 same-skill repairs passed");
