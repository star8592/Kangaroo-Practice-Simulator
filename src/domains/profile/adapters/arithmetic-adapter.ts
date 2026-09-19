import type {
  ArithmeticAttempt,
  ArithmeticSession,
} from "@/lib/arithmetic-analytics";
import type { AnswerEventPayload, LearningEvent } from "../events/types";

export type ArithmeticAdapterOptions = {
  studentId?: string;
};

export function arithmeticAttemptToLearningEvent(
  attempt: ArithmeticAttempt,
  studentId: string,
  timestamp = new Date().toISOString(),
): LearningEvent<AnswerEventPayload> {
  return {
    eventId: crypto.randomUUID(),
    studentId,
    domain: "arithmetic",
    eventType: "answer",
    timestamp,
    payload: {
      skill: attempt.item.skillId,
      correct: attempt.correct,
      responseTimeMs: attempt.responseMs,
      firstInputMs: attempt.firstInputMs,
      errorType: attempt.reason,
      strategy: attempt.item.strategy,
    },
  };
}

/**
 * Convert an existing arithmetic session into canonical profile events
 * without changing the current persistence/API format.
 */
export function arithmeticSessionToLearningEvents(
  session: ArithmeticSession,
  options: ArithmeticAdapterOptions = {},
): LearningEvent<AnswerEventPayload>[] {
  const studentId = options.studentId ?? session.studentId;
  if (!studentId) return [];

  const sessionDuration = Math.max(1, session.finishedAt - session.startedAt);

  return session.attempts.map((attempt, index) => {
    const elapsedBefore = session.attempts
      .slice(0, index)
      .reduce((sum, item) => sum + Math.max(1, item.responseMs), 0);
    const ratio = Math.min(1, elapsedBefore / sessionDuration);
    const timestamp = new Date(
      session.startedAt + sessionDuration * ratio,
    ).toISOString();

    return arithmeticAttemptToLearningEvent(attempt, studentId, timestamp);
  });
}
