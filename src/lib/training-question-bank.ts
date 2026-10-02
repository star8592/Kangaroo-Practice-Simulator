import type { ExamBundle, PublicQuestion, Question } from "./types";
import { mathVerificationForQuestion } from "./math-verification";
import { listStoredExamProfiles, loadStoredExamBundle } from "./exam-bundle-store";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function hasVisual(q: Question) {
  return Boolean(
    q.studentAssetUrl ||
      q.studentAssetUrlZh ||
      q.studentAssetUrlEn ||
      q.assetUrl ||
      q.assetUrlZh ||
      q.assetUrlEn,
  );
}

/** Authenticated private-training gate; independent of public distribution flags. */
export function isTrainingReadyQuestion(q: Question) {
  const sourceVerifiedOriginal = Boolean(
    (q.verified || q.review?.verified) &&
      q.review?.translationStatus === "source-verified" &&
      q.review?.visualVerified === true,
  );
  if ((!sourceVerifiedOriginal && (q.examReady === false || q.review?.needsReview === true)) || !text(q.answer)) return false;
  if (!text(q.stem) && !text(q.stemEn) && !text(q.localized?.zh?.stem) && !text(q.localized?.en?.stem) && !hasVisual(q)) return false;
  const mode = q.answerMode || (q.choices?.length ? "choice" : "integer");
  if (mode === "choice") {
    const keys = new Set((q.choices || []).map((choice) => text(choice.key)).filter(Boolean));
    if (keys.size < 2 || !keys.has(text(q.answer))) return false;
  }
  return true;
}

export function isExamBundleTrainingReady(bundle: ExamBundle) {
  return Boolean(bundle.profile.id && bundle.profile.questionCount > 0 && bundle.questions.length === bundle.profile.questionCount && bundle.questions.every(isTrainingReadyQuestion));
}

export function loadTrainingExamBundle(examId: string): ExamBundle {
  return loadStoredExamBundle(examId, {
    gate: isExamBundleTrainingReady,
    requireReadyDirect: true,
    incompleteMessage: (id) => `Training exam is incomplete: ${id}`,
    missingMessage: (id) => `Local training exam bundle not found: ${id}`,
  });
}

export function listTrainingExamProfiles() {
  return listStoredExamProfiles(isExamBundleTrainingReady);
}

export function trainingQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => {
    if (!isTrainingReadyQuestion(q)) throw new Error(`Question ${q.id} is not training-ready`);
    const zh = q.localized?.zh;
    const en = q.localized?.en;
    const commonVisual = q.studentAssetUrl || q.assetUrl;
    return {
      id: q.id,
      year: q.year,
      level: q.level,
      grades: q.grades,
      language: q.language,
      questionNo: q.questionNo,
      points: q.points,
      answerMode: q.answerMode,
      concept: q.concept,
      stem: text(zh?.stem) || text(q.stem) || "请查看下方原题图。",
      stemEn: text(en?.stem) || text(q.stemEn) || text(q.stem) || "See the problem image below.",
      choices: zh?.choices?.length ? zh.choices : q.choices,
      choicesEn: en?.choices?.length ? en.choices : q.choicesEn?.length ? q.choicesEn : q.choices,
      assetUrl: commonVisual,
      assetUrlZh: q.studentAssetUrlZh || q.assetUrlZh || commonVisual,
      assetUrlEn: q.studentAssetUrlEn || q.assetUrlEn || commonVisual,
      verified: Boolean(q.verified || q.review?.verified),
      mathVerification: mathVerificationForQuestion(q.id),
    };
  });
}
