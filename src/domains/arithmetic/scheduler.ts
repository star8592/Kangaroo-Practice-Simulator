import type { ArithmeticAttempt } from './types';

export type TrainingPriority = 'speed' | 'accuracy' | 'extension';

export interface TrainingPlan {
  skill: string;
  priority: TrainingPriority;
  reason: string;
  recommendedCount: number;
}

export function buildTrainingPlan(
  skill: string,
  attempts: ArithmeticAttempt[],
): TrainingPlan {
  if (attempts.length === 0) {
    return {
      skill,
      priority: 'accuracy',
      reason: 'no_history',
      recommendedCount: 10,
    };
  }

  const correct = attempts.filter((item) => item.correct).length;
  const accuracy = correct / attempts.length;
  const avgTime =
    attempts.reduce((sum, item) => sum + item.responseTimeMs, 0) /
    attempts.length;

  if (accuracy < 0.8) {
    return {
      skill,
      priority: 'accuracy',
      reason: 'accuracy_needs_improvement',
      recommendedCount: 20,
    };
  }

  if (avgTime > 3000) {
    return {
      skill,
      priority: 'speed',
      reason: 'automation_needs_improvement',
      recommendedCount: 30,
    };
  }

  return {
    skill,
    priority: 'extension',
    reason: 'skill_stable',
    recommendedCount: 15,
  };
}
