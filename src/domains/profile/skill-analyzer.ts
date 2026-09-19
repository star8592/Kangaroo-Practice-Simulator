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
