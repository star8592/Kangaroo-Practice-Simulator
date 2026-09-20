import type { ArithmeticAttempt } from "./types";

export interface ArithmeticLearningEvent {
  domain: "arithmetic";
  eventType: "answer";
  skill: string;
  correct: boolean;
  responseTimeMs?: number;
  errorType?: string;
}

/**
 * Converts existing arithmetic session records into the unified learning event
 * format consumed by the student profile pipeline.
 */
export function toArithmeticLearningEvent(
  attempt: ArithmeticAttempt,
): ArithmeticLearningEvent {
  return {
    domain: "arithmetic",
    eventType: "answer",
    skill: attempt.skill ?? "mixed",
    correct: attempt.correct,
    responseTimeMs: attempt.responseTimeMs,
    errorType: attempt.errorType,
  };
}
