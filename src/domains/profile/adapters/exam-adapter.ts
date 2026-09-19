import type { AnswerEventPayload, LearningEvent } from "../events/types";

export type ExamAttemptInput = {
  studentId: string;
  competition: string;
  questionId: string;
  topic?: string;
  skill?: string;
  correct: boolean;
  durationMs?: number;
  difficulty?: number;
  timestamp?: string;
};

/**
 * Convert existing exam records into canonical profile learning events.
 * Existing exam APIs remain unchanged.
 */
export function examAttemptToLearningEvent(
  input: ExamAttemptInput,
): LearningEvent<AnswerEventPayload> {
  return {
    eventId: crypto.randomUUID(),
    studentId: input.studentId,
    domain: "competition",
    eventType: "answer",
    timestamp: input.timestamp ?? new Date().toISOString(),
    payload: {
      competition: input.competition,
      questionId: input.questionId,
      topic: input.topic,
      skill: input.skill ?? input.topic,
      correct: input.correct,
      responseTimeMs: input.durationMs,
      difficulty: input.difficulty,
    },
  };
}
