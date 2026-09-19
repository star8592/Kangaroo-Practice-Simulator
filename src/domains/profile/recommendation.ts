import type { AnswerEventPayload, LearningEvent } from "./events/types";
import type {
  RecommendationPriority,
  RecommendationReason,
  TrainingRecommendation,
} from "./recommendation-types";

const MIN_EVIDENCE = 4;

function recommendationFor(
  skill: string,
  total: number,
  correct: number,
): TrainingRecommendation {
  if (total < MIN_EVIDENCE) {
    return {
      skill,
      priority: "low",
      reason: "insufficient_attempts",
      message: "样本不足，继续正常训练并收集更多证据。",
    };
  }

  const accuracy = correct / total;

  if (accuracy < 0.6) {
    return {
      skill,
      priority: "high",
      reason: "accuracy_low",
      message: "正确率持续偏低，进入针对性补强训练。",
    };
  }

  if (accuracy < 0.85) {
    return {
      skill,
      priority: "medium",
      reason: "needs_reinforcement",
      message: "已有部分掌握，继续结构化巩固。",
    };
  }

  return {
    skill,
    priority: "low",
    reason: "stable_skill",
    message: "当前表现稳定，保持训练并逐步提升难度。",
  };
}

export function recommendTraining(events: LearningEvent[]): TrainingRecommendation[] {
  const stats = new Map<string, { total: number; correct: number }>();

  for (const event of events) {
    if (event.eventType !== "answer") continue;
    const payload = event.payload as Partial<AnswerEventPayload>;
    if (typeof payload.correct !== "boolean") continue;

    const skill = payload.skill?.trim() || "unknown";
    const current = stats.get(skill) ?? { total: 0, correct: 0 };
    current.total += 1;
    if (payload.correct) current.correct += 1;
    stats.set(skill, current);
  }

  return Array.from(stats.entries())
    .map(([skill, value]) => recommendationFor(skill, value.total, value.correct))
    .sort((a, b) => {
      const rank: Record<RecommendationPriority, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };
      return rank[b.priority] - rank[a.priority] || a.skill.localeCompare(b.skill);
    });
}

export type { RecommendationPriority, RecommendationReason, TrainingRecommendation };
