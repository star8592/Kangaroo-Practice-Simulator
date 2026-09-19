import type { ExamAttemptRecord } from "@/lib/attempt-store";
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
 * Convert one exam question result into a canonical profile event.
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

/**
 * Bridge the existing persisted exam record into profile events.
 * Unanswered questions are intentionally excluded from skill accuracy
 * until the profile model has a dedicated blank/skip signal.
 */
export function examRecordToLearningEvents(
  record: ExamAttemptRecord,
): LearningEvent<AnswerEventPayload>[] {
  const timestamp = new Date(record.submittedAt).toISOString();
  const competition =
    record.profile.competitionId ??
    record.profile.formatId ??
    record.profile.name;

  return record.questions.flatMap((question) => {
    if (typeof question.correct !== "boolean") return [];

    return [
      examAttemptToLearningEvent({
        studentId: record.userId,
        competition,
        questionId: question.questionId,
        topic: question.concept,
        skill: question.concept,
        correct: question.correct,
        durationMs: question.dwellMs,
        difficulty: question.points,
        timestamp,
      }),
    ];
  });
}
