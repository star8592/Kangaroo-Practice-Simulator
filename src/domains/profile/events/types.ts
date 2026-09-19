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

/** Backward-compatible domain name used by the first profile engine code. */
export type LearningEvent<TPayload = Record<string, unknown>> =
  StudentProfileEvent<TPayload>;

export interface AnswerEventPayload {
  skill?: string;
  correct: boolean;
  responseTimeMs?: number;
  firstInputMs?: number;
  difficulty?: number;
  questionId?: string;
  competition?: string;
  topic?: string;
  errorType?: string;
  strategy?: string;
}
