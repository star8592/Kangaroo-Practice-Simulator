import type { CognitiveObservation, CognitivePrimitive } from "../core/layers";

export type PrimitiveEvidence = {
  primitive: CognitivePrimitive;
  attempts: number;
  successes: number;
  successRate: number | null;
  medianLatencyMs: number | null;
  hintReliance: number | null;
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
    const items = observations.filter((o) => o.primitive === primitive);
    const attempts = items.length;
    const successes = items.filter((o) => o.success === true).length;
    const latencies = items.map((o) => o.latencyMs).filter((x): x is number => typeof x === "number");
    const hinted = items.filter((o) => (o.hintLevel ?? 0) > 0).length;
    return {
      primitive,
      attempts,
      successes,
      successRate: attempts ? Math.round((successes / attempts) * 100) : null,
      medianLatencyMs: median(latencies),
      hintReliance: attempts ? Math.round((hinted / attempts) * 100) : null,
    };
  });
}
