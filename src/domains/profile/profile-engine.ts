import type { LearningEvent } from './events/types';

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

/**
 * First lightweight profile engine.
 *
 * This layer intentionally does not replace existing analytics yet.
 * It provides a stable domain boundary for future competition,
 * arithmetic and solution feedback integration.
 */
export function buildProfileSnapshot(
  studentId: string,
  events: LearningEvent[],
): ProfileSnapshot {
  const map = new Map<string, SkillSignal>();

  for (const event of events) {
    if (event.studentId !== studentId) continue;
    if (event.eventType !== 'answer') continue;

    const skill = event.skill ?? 'unknown';
    const current = map.get(skill) ?? {
      skill,
      attempts: 0,
      correct: 0,
      accuracy: 0,
    };

    current.attempts += 1;
    if (event.correct) current.correct += 1;
    current.accuracy = current.correct / current.attempts;

    map.set(skill, current);
  }

  return {
    studentId,
    skills: Array.from(map.values()),
  };
}
