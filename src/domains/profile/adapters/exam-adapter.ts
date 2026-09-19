import type { LearningEvent } from "../events/types";

export type ExamAttemptInput = {
  studentId: string;
  competition: string;
  questionId: string;
  topic?: string;
  correct: boolean;
  durationMs?: number;
};

/**
 * Convert existing exam records into profile learning events.
 * This adapter intentionally keeps the existing exam APIs unchanged.
 */
export function examAttemptToLearningEvent(
  input: ExamAttemptInput,
): LearningEvent {
  return {
    eventId: crypto.randomUUID(),
    studentId: input.studentId,
    domain: "competition",
    eventType: "answer",
    timestamp: new Date().toISOString(),
    payload: {
      competition: input.competition,
      questionId: input.questionId,
      topic: input.topic,
      correct: input.correct,
      durationMs: input.durationMs,
    },
  };
}
