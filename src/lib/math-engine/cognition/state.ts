import type { CognitiveObservation, CognitivePrimitive } from "../core/layers";

export type PrimitiveEvidence = {
  primitive: CognitivePrimitive;
  attempts: number;
  observedAttempts: number;
  inferredAttempts: number;
  successes: number;
  successRate: number | null;
  medianLatencyMs: number | null;
  hintReliance: number | null;
  meanConfidence: number | null;
};

const PRIMITIVES: CognitivePrimitive[] = [
  "perceive", "represent", "chunk", "transform", "search",
  "evaluate", "execute", "verify", "reflect", "transfer",
];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function summarizeCognition(observations: CognitiveObservation[]): PrimitiveEvidence[] {
  return PRIMITIVES.map((primitive) => {
    const items = observations.filter((o) => o.primitive === primitive && (o.confidence ?? 1) >= 0.5);
    const attempts = items.length;
    const observedAttempts = items.filter((o) => (o.source ?? "observed") === "observed").length;
    const inferredAttempts = attempts - observedAttempts;
    const successes = items.filter((o) => o.success === true).length;
    const resolved = items.filter((o) => typeof o.success === "boolean");
    const latencies = items.map((o) => o.latencyMs).filter((x): x is number => typeof x === "number");
    const hinted = items.filter((o) => (o.hintLevel ?? 0) > 0).length;
    const confidences = items.map((o) => o.confidence ?? 1);
    const meanConfidence = confidences.length ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) : null;
    return {
      primitive,
      attempts,
      observedAttempts,
      inferredAttempts,
      successes,
      successRate: resolved.length ? Math.round((successes / resolved.length) * 100) : null,
      medianLatencyMs: median(latencies),
      hintReliance: attempts ? Math.round((hinted / attempts) * 100) : null,
      meanConfidence,
    };
  });
}
