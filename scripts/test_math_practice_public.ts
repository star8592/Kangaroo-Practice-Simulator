import assert from "node:assert/strict";
import { GRADE_PROFILES, type ArithmeticGrade } from "../src/lib/arithmetic";
import { ARITHMETIC_GRADE_GUIDE } from "../src/lib/arithmetic-grade-guide";

const grades = Array.from({ length: 12 }, (_, index) => (index + 1) as ArithmeticGrade);
const ids = new Set<number>();
for (const grade of grades) {
  const profile = GRADE_PROFILES[grade];
  const guide = ARITHMETIC_GRADE_GUIDE[grade];
  assert.ok(profile && guide, `Missing public training curriculum for G${grade}`);
  assert.equal(profile.grade, grade);
  assert.ok(profile.skills.length > 0, `No training skills for G${grade}`);
  assert.ok(guide.headline.trim() && guide.goal.trim() && guide.watch.trim());
  for (const skill of profile.skills) {
    assert.ok(skill.labelZh.trim(), `Missing public skill title in G${grade}`);
  }
  ids.add(grade);
}
assert.equal(ids.size, 12);
console.log("MATH_PRACTICE_PUBLIC_CURRICULUM=PASS grades=12");
