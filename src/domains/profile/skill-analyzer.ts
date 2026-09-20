import type { AnswerEventPayload, LearningEvent } from "./events/types";

export interface SkillEvidence {
  skill: string;
  attempts: number;
  correct: number;
  averageResponseTimeMs?: number;
}

export interface SkillAnalysis {
  skill: string;
  accuracy: number;
  level: "weak" | "developing" | "stable";
  reason: string;
}

/**
 * First version of explainable skill analysis.
 * This intentionally uses simple rules so results remain inspectable.
 * Future versions can add statistical models without changing callers.
 */
export function analyzeSkill(evidence: SkillEvidence): SkillAnalysis {
  const accuracy = evidence.attempts > 0
    ? evidence.correct / evidence.attempts
    : 0;

  if (accuracy < 0.6) {
    return {
      skill: evidence.skill,
      accuracy,
      level: "weak",
      reason: "accuracy_low"
    };
  }

  if (accuracy < 0.85) {
    return {
      skill: evidence.skill,
      accuracy,
      level: "developing",
      reason: "needs_reinforcement"
    };
  }

  return {
    skill: evidence.skill,
    accuracy,
    level: "stable",
    reason: "stable_skill"
  };
}


export function analyzeSkills(events: LearningEvent[]): SkillAnalysis[] {
  const stats = new Map<string, SkillEvidence>();
  for (const event of events) {
    if (event.eventType !== "answer") continue;
    const payload = event.payload as Partial<AnswerEventPayload>;
    if (typeof payload.correct !== "boolean") continue;
    const skill = payload.skill?.trim() || "unknown";
    const current = stats.get(skill) ?? { skill, attempts: 0, correct: 0 };
    current.attempts += 1;
    if (payload.correct) current.correct += 1;
    if (typeof payload.responseTimeMs === "number" && Number.isFinite(payload.responseTimeMs)) {
      const previousTotal = (current.averageResponseTimeMs ?? 0) * Math.max(0, current.attempts - 1);
      current.averageResponseTimeMs = (previousTotal + payload.responseTimeMs) / current.attempts;
    }
    stats.set(skill, current);
  }
  return Array.from(stats.values()).map(analyzeSkill);
}
