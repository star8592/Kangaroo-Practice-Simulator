import type { TeachingPolicyDecision } from "../core/layers";
import type { LearningGoal, TrainingPolicy } from "../core/model";
import type { PrimitiveEvidence } from "../cognition/state";

export function chooseTeachingPolicy(
  evidence: PrimitiveEvidence[],
  policy: TrainingPolicy,
): TeachingPolicyDecision {
  const byPrimitive = new Map(evidence.map((item) => [item.primitive, item]));
  const represent = byPrimitive.get("represent");
  const transform = byPrimitive.get("transform");
  const transfer = byPrimitive.get("transfer");
  const perceive = byPrimitive.get("perceive");

  let targetGoals: LearningGoal[] = ["structure", "strategy"];
  let intervention: TeachingPolicyDecision["intervention"] = "none";
  let reason = "insufficient evidence; preserve current difficulty";

  if (perceive?.successRate !== null && (perceive?.successRate ?? 100) < 70) {
    intervention = "attention_hint";
    targetGoals = ["structure"];
    reason = "structure is not being noticed reliably";
  } else if (represent?.successRate !== null && (represent?.successRate ?? 100) < 70) {
    intervention = "representation_hint";
    targetGoals = ["representation", "structure"];
    reason = "representation switching is the current bottleneck";
  } else if (transform?.successRate !== null && (transform?.successRate ?? 100) < 70) {
    intervention = "transformation_hint";
    targetGoals = ["strategy", "reasoning"];
    reason = "legal transformation selection is unstable";
  } else if ((transfer?.attempts ?? 0) >= 3 && (transfer?.successRate ?? 100) < 75) {
    intervention = "transfer_probe";
    targetGoals = ["transfer"];
    reason = "independent performance does not yet generalize";
  }

  return { policy, targetGoals, intervention, reason };
}
