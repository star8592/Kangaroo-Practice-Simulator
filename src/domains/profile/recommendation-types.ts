export type RecommendationPriority = "low" | "medium" | "high";

export type RecommendationReason =
  | "accuracy_low"
  | "insufficient_attempts"
  | "needs_reinforcement"
  | "stable_skill";

export interface TrainingRecommendation {
  skill: string;
  priority: RecommendationPriority;
  reason: RecommendationReason;
  message: string;
}

export interface SkillSnapshot {
  skill: string;
  attempts: number;
  correct: number;
  accuracy: number;
}
