import type { LearningEvent } from "./events/types";
import { validateLearningEvent } from "./events/validators";
import { analyzeSkills } from "./skill-analyzer";

export type ProfilePipelineResult = {
  accepted: LearningEvent[];
  rejected: LearningEvent[];
  skills: ReturnType<typeof analyzeSkills>;
};

/**
 * Canonical entry point for learning events.
 *
 * Adapters convert existing business data into LearningEvent first.
 * The pipeline validates and forwards events into profile analysis.
 */
export function processLearningEvents(
  events: LearningEvent[],
): ProfilePipelineResult {
  const accepted: LearningEvent[] = [];
  const rejected: LearningEvent[] = [];

  for (const event of events) {
    if (validateLearningEvent(event)) {
      accepted.push(event);
    } else {
      rejected.push(event);
    }
  }

  return {
    accepted,
    rejected,
    skills: analyzeSkills(accepted),
  };
}
