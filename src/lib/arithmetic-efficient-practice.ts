import { GRADE_PROFILES, type ArithmeticGrade } from "./arithmetic";
import { generateArithmeticSet, type ArithmeticItem } from "./arithmetic-generator";
import type { ArithmeticAttempt } from "./arithmetic-analytics";

/**
 * A conservative within-session checkpoint, not a claim of long-term mastery.
 * Avoids unnecessary trailing questions only after the student demonstrates
 * sufficient clean evidence; long-term retention still requires a later retest.
 */
export function adaptiveStopDecision(
  attempts: ArithmeticAttempt[],
  focusSkills: string[],
  minQuestions = 8,
): { stop: boolean; reason: "more_evidence" | "needs_repair" | "stable_for_now" } {
  if (attempts.length < minQuestions) return { stop: false, reason: "more_evidence" };
  const recent = attempts.slice(-6);
  if (recent.length < 6 || recent.some(a => !a.correct || a.reason !== "correct")) {
    return { stop: false, reason: "needs_repair" };
  }
  // Preserve coverage: fast performance on a single type cannot end a broad session.
  if (new Set(attempts.map(a => a.item.skillId)).size < 2) {
    return { stop: false, reason: "more_evidence" };
  }
  const atRisk = new Set([
    ...focusSkills,
    ...attempts.filter(a => !a.correct || a.reason !== "correct").map(a => a.item.skillId),
  ]);
  for (const skill of atRisk) {
    const evidence = attempts.filter(a => a.item.skillId === skill);
    const lastTwo = evidence.slice(-2);
    if (lastTwo.length < 2 || lastTwo.some(a => !a.correct || a.reason !== "correct")) {
      return { stop: false, reason: "needs_repair" };
    }
  }
  return { stop: true, reason: "stable_for_now" };
}

/** Four short observations per core module give the current metric its minimum evidence. */
export function baselineQuestionCount(grade: ArithmeticGrade): number {
  return Math.max(12, GRADE_PROFILES[grade].skills.length * 4);
}

/** Generate a genuine same-skill, different-prompt repair; never silently change skills. */
export function makeDistinctRepair(
  grade: ArithmeticGrade,
  skillId: string,
  seed: number,
  usedPrompts: ReadonlySet<string>,
  expectedMs: number,
): ArithmeticItem | null {
  for (let attempt = 0; attempt < 4; attempt++) {
    const candidates = generateArithmeticSet(grade, 48, seed + attempt * 977, [skillId]);
    const found = candidates.find(item =>
      item.skillId === skillId && !usedPrompts.has(item.prompt),
    );
    if (found) return {
      ...found,
      id: `${found.id}-repair-${seed}-${attempt}`,
      expectedMs,
    };
  }
  return null;
}
