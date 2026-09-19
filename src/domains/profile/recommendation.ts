import type { LearningEvent } from './events/types';

type RecommendationPriority = 'low' | 'medium' | 'high';

export interface TrainingRecommendation {
  skill: string;
  priority: RecommendationPriority;
  reason: string;
  action: string;
}

export function recommendTraining(events: LearningEvent[]): TrainingRecommendation[] {
  const stats = new Map<string, { total: number; correct: number }>();

  for (const event of events) {
    if (event.eventType !== 'answer') continue;

    const skill = String((event.payload as { skill?: string }).skill ?? 'unknown');
    const current = stats.get(skill) ?? { total: 0, correct: 0 };

    current.total += 1;
    if ((event.payload as { correct?: boolean }).correct) {
      current.correct += 1;
    }

    stats.set(skill, current);
  }

  return Array.from(stats.entries()).map(([skill, value]) => {
    const accuracy = value.total === 0 ? 0 : value.correct / value.total;

    if (accuracy < 0.6) {
      return {
        skill,
        priority: 'high',
        reason: 'accuracy_low',
        action: 'increase targeted practice'
      };
    }

    if (accuracy < 0.85) {
      return {
        skill,
        priority: 'medium',
        reason: 'needs_reinforcement',
        action: 'continue structured practice'
      };
    }

    return {
      skill,
      priority: 'low',
      reason: 'stable_skill',
      action: 'maintain and extend'
    };
  });
}
