import type { AnswerEventPayload, LearningEvent } from "./events/types";

export type SkillSignal = {
  skill: string;
  attempts: number;
  correct: number;
  accuracy: number;
  averageResponseTimeMs?: number;
};

export type ProfileSnapshot = {
  studentId: string;
  skills: SkillSignal[];
};

type MutableSkillSignal = SkillSignal & {
  responseTimeTotalMs: number;
  responseTimeSamples: number;
};

/**
 * Lightweight, explainable profile engine.
 * It reads the canonical event payload shape and does not replace
 * the existing analytics pipeline yet.
 */
export function buildProfileSnapshot(
  studentId: string,
  events: LearningEvent[],
): ProfileSnapshot {
  const map = new Map<string, MutableSkillSignal>();

  for (const event of events) {
    if (event.studentId !== studentId || event.eventType !== "answer") continue;

    const payload = event.payload as Partial<AnswerEventPayload>;
    if (typeof payload.correct !== "boolean") continue;

    const skill = payload.skill?.trim() || "unknown";
    const current = map.get(skill) ?? {
      skill,
      attempts: 0,
      correct: 0,
      accuracy: 0,
      responseTimeTotalMs: 0,
      responseTimeSamples: 0,
    };

    current.attempts += 1;
    if (payload.correct) current.correct += 1;
    current.accuracy = current.correct / current.attempts;

    if (
      typeof payload.responseTimeMs === "number" &&
      Number.isFinite(payload.responseTimeMs) &&
      payload.responseTimeMs >= 0
    ) {
      current.responseTimeTotalMs += payload.responseTimeMs;
      current.responseTimeSamples += 1;
      current.averageResponseTimeMs =
        current.responseTimeTotalMs / current.responseTimeSamples;
    }

    map.set(skill, current);
  }

  return {
    studentId,
    skills: Array.from(map.values()).map(
      ({ responseTimeTotalMs: _total, responseTimeSamples: _samples, ...skill }) =>
        skill,
    ),
  };
}
