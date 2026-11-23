import type { ExamProfile } from "./types";

export const EXAM_DIAGNOSTIC_PRODUCT_ID = "math-competition-diagnostic";
export const EXAM_DIAGNOSTIC_CREDITS = 1;

/** The paid service is a traditional, fixed-paper mock exam—not an untimed practice set or generated smart paper. */
export function isFormalStaticMockExam(paperType: ExamProfile["paperType"] | string | undefined): boolean {
  return paperType === "past" || paperType === "sample";
}

// Paid online mock exams must have confirmed commercial question-display rights.
// Ordinary training-readiness and the number of locally stored files are not substitutes.
export function isCommercialMockExamReady(profile: ExamProfile): boolean {
  const originalPractice = profile.paperType === "practice"
    && profile.sourceRegistryId === "user-original-math-simulations";
  return Boolean(
    (isFormalStaticMockExam(profile.paperType) || originalPractice)
    && profile.questionCount > 0
    && profile.durationSeconds > 0
    && profile.rightsPolicy?.commercialUse === true
    && profile.rightsPolicy?.publicQuestionDisplay === true
  );
}
