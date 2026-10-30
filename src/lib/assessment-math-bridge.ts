import { createHash } from "node:crypto";
import { gradeExam } from "./grading";
import type { ExamBundle, GradeResult } from "./types";

/**
 * P1 shadow adapter: use the original, authoritative maths grader unchanged.
 * Legacy exams do not consistently carry immutable per-question revisions or
 * source-rights digests, so DO NOT fabricate ScoringEvidenceContract or silently
 * migrate existing attempts. This receipt is internal-only migration evidence.
 */
export type LegacyMathParityReceipt = Readonly<{
  examId: string;
  competitionId: string | null;
  formatId: string | null;
  itemCount: number;
  gradeScore: number;
  gradeMaxScore: number;
  scoreDeltaTotal: number;
  initialScore: number;
  parity: true;
  questionOrderDigest: string;
  resultSchema: "legacy-math-parity-v1";
}>;

export function gradeMathWithParityReceipt(
  bundle: ExamBundle,
  answers: Record<string, string>,
  lang: "zh" | "en" = "zh",
): { grade: GradeResult; receipt: LegacyMathParityReceipt } {
  const { profile, questions } = bundle;
  if (questions.length !== profile.questionCount) throw new Error("math-blueprint-item-count-mismatch");
  if (new Set(questions.map(q => q.id)).size !== questions.length) throw new Error("math-blueprint-duplicate-items");
  if (Object.keys(answers).some(id => !questions.some(q=>q.id===id))) throw new Error("unknown-math-answer");
  // The original scorer is the only source of truth. Do not implement a
  // competing scoring path during this reversible migration.
  const grade = gradeExam(questions, answers, profile, lang);
  const sum = Math.round((profile.initialScore + grade.items.reduce((n, q) => n + q.scoreDelta, 0)) * 100) / 100;
  if (Math.abs(sum - grade.score) > 1e-8) throw new Error("legacy-grade-parity-failed");
  if (grade.items.length !== questions.length || grade.maxScore !== profile.maxScore)
    throw new Error("legacy-grade-structure-changed");
  return {
    grade,
    receipt: {
      examId: profile.id, competitionId: profile.competitionId ?? null,
      formatId: profile.formatId ?? null, itemCount: questions.length,
      gradeScore: grade.score, gradeMaxScore: grade.maxScore,
      scoreDeltaTotal: Math.round(grade.items.reduce((n,q)=>n+q.scoreDelta,0)*100)/100,
      initialScore: profile.initialScore, parity: true,
      questionOrderDigest: createHash("sha256").update(JSON.stringify(questions.map(q=>q.id))).digest("hex"),
      resultSchema: "legacy-math-parity-v1",
    }
  };
}
