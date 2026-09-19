export type LearningDomain =
  | "competition"
  | "arithmetic"
  | "solution";

export type ProfileEventType =
  | "answer"
  | "attempt_started"
  | "attempt_finished"
  | "hint_used"
  | "review_completed";

export interface StudentProfileEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  studentId: string;
  domain: LearningDomain;
  eventType: ProfileEventType;
  timestamp: string;
  payload: TPayload;
}

export interface AnswerEventPayload {
  skill?: string;
  correct: boolean;
  responseTimeMs?: number;
  difficulty?: number;
}
