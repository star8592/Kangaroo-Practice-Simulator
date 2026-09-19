import type { HintUsedEventPayload, LearningEvent } from "../events/types";

export type SolutionInteraction = {
  studentId: string;
  skill?: string;
  hintCount?: number;
  stepCount?: number;
  timestamp?: string;
  reason?: string;
};

/**
 * Convert solution-engine interactions into canonical profile events.
 * The adapter intentionally keeps solution data separate from scoring logic.
 */
export function solutionInteractionToLearningEvent(
  interaction: SolutionInteraction,
): LearningEvent<HintUsedEventPayload> {
  return {
    eventId: crypto.randomUUID(),
    studentId: interaction.studentId,
    domain: "solution",
    eventType: "hint_used",
    timestamp: interaction.timestamp ?? new Date().toISOString(),
    payload: {
      skill: interaction.skill ?? "unknown",
      hintCount: interaction.hintCount ?? 0,
      stepCount: interaction.stepCount ?? 0,
      reason: interaction.reason,
    },
  };
}
