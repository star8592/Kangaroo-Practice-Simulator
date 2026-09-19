import type { ExamProfile, GradeResult, Question } from "./types";

function answersEqual(q:Question,selected:string){
  if(q.answerMode==="integer"&&/^\d{1,3}$/.test(selected)&&/^\d{1,3}$/.test(q.answer)) return Number(selected)===Number(q.answer);
  return selected===q.answer;
}

function wrongDelta(q: Question, profile: ExamProfile) {
  if (profile.wrongPenaltyMode === "quarter-points") return -(q.points * profile.wrongPenaltyValue);
  return -profile.wrongPenaltyValue;
}

export function gradeExam(questions: Question[], answers: Record<string, string>, profile: ExamProfile, lang: "zh" | "en" = "zh"): GradeResult {
  let score = profile.initialScore;
  let correct = 0, wrong = 0, blank = 0;
  const byPoints: GradeResult["byPoints"] = {};
  const byConcept: GradeResult["byConcept"] = {};
  const byPosition: NonNullable<GradeResult["byPosition"]> = {};
  const items = questions.map((q) => {
    const selected = answers[q.id] ?? null;
    const isBlank = !selected;
    const isCorrect = !isBlank && answersEqual(q, selected);
    const delta = isBlank ? (profile.blankScoreValue ?? 0) : isCorrect ? q.points : wrongDelta(q, profile);
    score += delta;
    if (isBlank) blank += 1; else if (isCorrect) correct += 1; else wrong += 1;
    const p = String(q.points);
    byPoints[p] ??= { correct: 0, total: 0 };
    byPoints[p].total += 1;
    if (isCorrect) byPoints[p].correct += 1;
    const concept = q.localized?.zh && q.localized?.en ? "official_original" : q.concept;
    byConcept[concept] ??= { correct: 0, total: 0 };
    byConcept[concept].total += 1;
    if (isCorrect) byConcept[concept].correct += 1;
    if (profile.competitionId === "maa-amc") {
      const aime=profile.formatId?.startsWith("maa-aime");
      const label=aime?(q.questionNo<=5?"Q1–5":q.questionNo<=10?"Q6–10":"Q11–15"):(q.questionNo<=10?"Q1–10":q.questionNo<=20?"Q11–20":"Q21–25");
      byPosition[label] ??= { correct: 0, total: 0 }; byPosition[label].total += 1; if (isCorrect) byPosition[label].correct += 1;
    }
    const solution = q.localized?.zh && q.localized?.en
      ? (q.localized?.[lang]?.solution ?? "")
      : q.solution;
    return { questionId:q.id, questionNo:q.questionNo, selected, correctAnswer:q.answer,
      correct:isBlank?null:isCorrect, scoreDelta:delta, points:q.points, concept, solution };
  });
  score = Math.round(score * 100) / 100;
  return { score, maxScore:profile.maxScore, correct, wrong, blank, items, byPoints, byConcept, byPosition:Object.keys(byPosition).length?byPosition:undefined };
}
