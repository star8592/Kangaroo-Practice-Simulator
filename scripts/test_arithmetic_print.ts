import assert from "node:assert/strict";
import { buildTrainingPlan, type ArithmeticAttempt, type ArithmeticSession } from "../src/lib/arithmetic-analytics";
import type { ArithmeticItem } from "../src/lib/arithmetic-generator";
import { makeArithmeticWorksheet } from "../src/lib/arithmetic-print";

function attempt(
  id: number,
  skillId: string,
  strategyNode: ArithmeticItem["strategyNode"],
  firstInputMs: number,
  correct = true,
): ArithmeticAttempt {
  const item: ArithmeticItem = {
    id: `print-test-${id}`,
    grade: 2,
    skillId,
    prompt: skillId === "add100" ? "38 + 29 = ?" : "7 × 8 = ?",
    answer: skillId === "add100" ? 67 : 56,
    strategy: skillId === "add100" ? "compensation" : "fact_recall",
    strategyNode,
    expectedMs: skillId === "add100" ? 5000 : 3000,
    difficulty: 2,
    meta: {},
  };
  const numericAnswer = correct ? item.answer : item.answer + 1;
  return {
    item,
    answer: String(numericAnswer),
    numericAnswer,
    correct,
    presentedAt: 0,
    firstInputAt: firstInputMs,
    submittedAt: firstInputMs + 300,
    firstInputMs,
    entryMs: 300,
    responseMs: firstInputMs + 300,
    edits: 0,
    backspaces: 0,
    reason: correct ? "correct" : "unknown",
    telemetryVersion: 3,
  };
}

const attempts = [
  ...Array.from({ length: 8 }, (_, i) => attempt(i, "add100", "add_compensation", 7200, true)),
  ...Array.from({ length: 8 }, (_, i) => attempt(20 + i, "times", "fact_recall", 1700, true)),
];
const session: ArithmeticSession = {
  id: "print-personalization",
  studentId: "test",
  grade: 2,
  mode: "adaptive",
  startedAt: 1,
  finishedAt: 2,
  attempts,
};
const plan = buildTrainingPlan(2, [session]);
assert(plan.focusSkills.includes("add100"));
assert(plan.focusNodes.includes("add_compensation"));

const smart = makeArithmeticWorksheet({
  grade: 2,
  count: 40,
  seed: 8592,
  index: 0,
  mode: "smart",
  plan,
});
assert.equal(smart.items.length, 40);
assert.equal(smart.personalized, true);
assert.deepEqual(smart.mix, { repair: 24, consolidate: 10, review: 6 });
assert.equal(smart.items.filter((x) => x.printSource === "repair").length, 24);
assert.equal(smart.items.filter((x) => x.printSource === "consolidate").length, 10);
assert.equal(smart.items.filter((x) => x.printSource === "review").length, 6);
assert(
  smart.items
    .filter((x) => x.printSource === "repair" || x.printSource === "consolidate")
    .every((x) => x.skillId === "add100"),
);

const repeat = makeArithmeticWorksheet({
  grade: 2,
  count: 40,
  seed: 8592,
  index: 0,
  mode: "smart",
  plan,
});
assert.deepEqual(
  repeat.items.map((x) => x.prompt),
  smart.items.map((x) => x.prompt),
);

const manual = makeArithmeticWorksheet({
  grade: 2,
  count: 40,
  seed: 24680,
  index: 0,
  mode: "manual",
  manualSkillId: "times",
  plan,
});
assert.equal(manual.items.length, 40);
assert(manual.items.every((x) => x.skillId === "times"));

const emptyPlan = buildTrainingPlan(2, []);
const noEvidence = makeArithmeticWorksheet({
  grade: 2,
  count: 40,
  seed: 13579,
  index: 0,
  mode: "smart",
  plan: emptyPlan,
});
assert.equal(noEvidence.items.length, 40);
assert.equal(noEvidence.personalized, false);
assert.deepEqual(noEvidence.mix, { repair: 0, consolidate: 0, review: 40 });

console.log("arithmetic print personalization: PASS");
