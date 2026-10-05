import type { PublicStudent } from "./auth";
import { loadExamAttempts } from "./attempt-store";
import { loadTrainingExamBundle, trainingQuestions } from "./training-question-bank";
import type { GradeResult, PublicQuestion } from "./types";

export type ReviewAttemptPayload = {
  examId: string;
  grade: GradeResult;
  answers: Record<string, string>;
  questions: PublicQuestion[];
};

function currentQuestionMap(examId: string) {
  try {
    const bundle = loadTrainingExamBundle(examId);
    return new Map(trainingQuestions(bundle.questions).map(q => [q.id, q]));
  } catch {
    return new Map<string, PublicQuestion>();
  }
}

export function buildReviewAttempt(user: PublicStudent, attemptId: string): ReviewAttemptPayload | null {
  const attempt = loadExamAttempts(user.id, 500).find(row => row.id === attemptId);
  if (!attempt) return null;

  const current = currentQuestionMap(attempt.examId);
  const questions: PublicQuestion[] = attempt.questions.map(row => {
    const saved = row.reviewSnapshot;
    const fallback = current.get(row.questionId);
    const choices = saved?.choices?.length ? saved.choices : fallback?.choices || [];
    const choicesEn = saved?.choicesEn?.length ? saved.choicesEn : fallback?.choicesEn;
    return {
      id: row.questionId,
      year: fallback?.year ?? attempt.profile.year ?? 0,
      level: fallback?.level ?? "",
      grades: fallback?.grades ?? attempt.profile.grades,
      language: fallback?.language ?? "zh",
      questionNo: row.questionNo,
      points: row.points,
      answerMode: saved?.answerMode || fallback?.answerMode || (choices.length ? "choice" : "integer"),
      concept: row.concept,
      stem: saved?.stem || fallback?.stem || "该历史记录暂未恢复题干，请从原试卷核对本题。",
      stemEn: saved?.stemEn || fallback?.stemEn,
      choices,
      choicesEn,
      assetUrl: saved?.assetUrl || fallback?.assetUrl,
      assetUrlZh: saved?.assetUrlZh || fallback?.assetUrlZh || saved?.assetUrl || fallback?.assetUrl,
      assetUrlEn: saved?.assetUrlEn || fallback?.assetUrlEn || saved?.assetUrl || fallback?.assetUrl,
      verified: fallback?.verified,
      mathVerification: fallback?.mathVerification,
    };
  });

  const answers = Object.fromEntries(
    attempt.questions.flatMap(row => row.selected ? [[row.questionId, row.selected] as const] : []),
  );
  return { examId: attempt.examId, grade: attempt.grade, answers, questions };
}
