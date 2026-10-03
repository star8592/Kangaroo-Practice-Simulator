import type { ArithmeticAttempt, ArithmeticSession } from "../../arithmetic-analytics";
import type { CognitiveObservation } from "../core/layers";
import { arithmeticAttemptToSignal } from "./arithmetic";

function confidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function arithmeticAttemptToCognitiveObservations(a: ArithmeticAttempt): CognitiveObservation[] {
  const signal = arithmeticAttemptToSignal(a);
  const entityId = signal.entityId;
  const hintLevel = signal.hintLevel;
  const timestamp = signal.timestamp;
  const base = { entityId, strategyId: signal.strategyId, stage: signal.stage, hintLevel, timestamp };
  const output: CognitiveObservation[] = [
    {
      ...base,
      primitive: "execute",
      latencyMs: a.responseMs,
      success: a.correct,
      source: "observed",
      confidence: 1,
    },
  ];

  const structureMiss = a.reason === "strategy_missed";
  const fluent = a.correct && a.firstInputMs <= a.item.expectedMs * 1.1;
  output.push({
    ...base,
    primitive: "perceive",
    latencyMs: a.firstInputMs,
    success: structureMiss ? false : fluent ? true : undefined,
    source: "inferred",
    confidence: confidence(structureMiss ? 0.8 : fluent ? 0.55 : 0.25),
  });

  if ((signal.transformations?.length ?? 0) > 0) {
    output.push({
      ...base,
      primitive: "transform",
      latencyMs: a.firstInputMs,
      success: a.correct && !structureMiss,
      transformationIds: signal.transformations,
      source: "inferred",
      confidence: confidence(a.correct && !structureMiss ? 0.5 : 0.65),
    });
  }

  return output;
}

export function arithmeticSessionsToCognitiveObservations(sessions: ArithmeticSession[]): CognitiveObservation[] {
  return sessions.flatMap((session) => session.attempts.flatMap(arithmeticAttemptToCognitiveObservations));
}
