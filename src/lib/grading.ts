import type { ExamProfile, GradeResult, Question } from "./types";

function wrongDelta(q: Question, profile: ExamProfile) {
  if (profile.wrongPenaltyMode === "quarter-points") return -(q.points * profile.wrongPenaltyValue);
  return -profile.wrongPenaltyValue;
}

export function gradeExam(questions: Question[], answers: Record<string, string>, profile: ExamProfile): GradeResult {
  let score = profile.initialScore;
  let correct = 0, wrong = 0, blank = 0;
  const byPoints: GradeResult["byPoints"] = {};
  const byConcept: GradeResult["byConcept"] = {};
  const items = questions.map((q) => {
    const selected = answers[q.id] ?? null;
    const isBlank = !selected;
    const isCorrect = !isBlank && selected === q.answer;
    const delta = isBlank ? 0 : isCorrect ? q.points : wrongDelta(q, profile);
    score += delta;
    if (isBlank) blank += 1; else if (isCorrect) correct += 1; else wrong += 1;
    const p = String(q.points);
    byPoints[p] ??= { correct: 0, total: 0 };
    byPoints[p].total += 1;
    if (isCorrect) byPoints[p].correct += 1;
    byConcept[q.concept] ??= { correct: 0, total: 0 };
    byConcept[q.concept].total += 1;
    if (isCorrect) byConcept[q.concept].correct += 1;
    return { questionId:q.id, questionNo:q.questionNo, selected, correctAnswer:q.answer,
      correct:isBlank?null:isCorrect, scoreDelta:delta, points:q.points, concept:q.concept, solution:q.solution };
  });
  score = Math.round(score * 100) / 100;
  return { score, maxScore:profile.maxScore, correct, wrong, blank, items, byPoints, byConcept };
}
