export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

const allowedDomains = [
  "competition",
  "arithmetic",
  "solution",
] as const;

const allowedEventTypes = [
  "answer",
  "attempt_started",
  "attempt_finished",
  "hint_used",
  "review_completed",
] as const;

export function validateLearningEvent(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["event must be an object"] };
  }

  const event = input as Record<string, unknown>;

  if (typeof event.studentId !== "string" || event.studentId.length === 0) {
    errors.push("studentId is required");
  }

  if (!allowedDomains.includes(event.domain as typeof allowedDomains[number])) {
    errors.push("invalid domain");
  }

  if (!allowedEventTypes.includes(event.eventType as typeof allowedEventTypes[number])) {
    errors.push("invalid eventType");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
