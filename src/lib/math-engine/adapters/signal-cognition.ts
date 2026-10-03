import type { CognitiveObservation } from "../core/layers";
import type { LearnerSignal } from "../core/model";

export type SignalEvidenceSource = "arithmetic" | "structure_discovery";

export function learnerSignalToCognitiveObservations(
  signal: LearnerSignal,
  source: SignalEvidenceSource,
): CognitiveObservation[] {
  if (source !== "structure_discovery") return [];

  const base = {
    entityId: signal.entityId,
    strategyId: signal.strategyId,
    stage: signal.stage,
    latencyMs: signal.latencyMs,
    hintLevel: signal.hintLevel,
    transformationIds: signal.transformations,
    source: "observed" as const,
    confidence: 1,
    timestamp: signal.timestamp,
  };

  return [
    { ...base, primitive: "represent", success: signal.correct },
    { ...base, primitive: "evaluate", success: signal.correct && signal.efficient !== false },
  ];
}
