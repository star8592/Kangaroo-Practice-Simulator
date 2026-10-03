import assert from "node:assert/strict";
import { chooseTeachingPolicy, summarizeCognition, type CognitiveObservation } from "../src/lib/math-engine";

const observations: CognitiveObservation[] = [
  { primitive: "perceive", entityId: "e1", success: true, latencyMs: 900, hintLevel: 0, timestamp: 1 },
  { primitive: "represent", entityId: "e1", success: false, latencyMs: 2200, hintLevel: 1, timestamp: 2 },
  { primitive: "represent", entityId: "e2", success: false, latencyMs: 2400, hintLevel: 2, timestamp: 3 },
  { primitive: "represent", entityId: "e3", success: true, latencyMs: 1800, hintLevel: 1, timestamp: 4 },
];

const summary = summarizeCognition(observations);
const represent = summary.find((x) => x.primitive === "represent");
assert.equal(represent?.successRate, 33);
assert.equal(represent?.hintReliance, 100);
const decision = chooseTeachingPolicy(summary, "discovery");
assert.equal(decision.intervention, "representation_hint");
assert(decision.targetGoals.includes("representation"));
console.log("math engine cognition: PASS");
