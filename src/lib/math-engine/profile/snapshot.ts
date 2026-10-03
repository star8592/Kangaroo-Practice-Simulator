import type { ArithmeticSession } from "../../arithmetic-analytics";
import type { TrainingPolicy } from "../core/model";
import type { StoredLearnerSignal } from "../signal-store";
import { arithmeticAttemptToSignal } from "../adapters/arithmetic";
import { arithmeticSessionsToCognitiveObservations } from "../adapters/arithmetic-cognition";
import { learnerSignalToCognitiveObservations } from "../adapters/signal-cognition";
import { summarizeCognition } from "../cognition/state";
import { chooseTeachingPolicy } from "../policy/coach";
import { buildLearnerProfile } from "./learner";

export function buildMathEngineSnapshot(
  sessions: ArithmeticSession[],
  policy: TrainingPolicy = "discovery",
  storedSignals: StoredLearnerSignal[] = [],
) {
  const arithmeticSignals = sessions.flatMap((session) => session.attempts.map(arithmeticAttemptToSignal));
  const explicitSignals = storedSignals.filter((x) => x.source !== "arithmetic");
  const signals = [...arithmeticSignals, ...explicitSignals];
  const observations = [
    ...arithmeticSessionsToCognitiveObservations(sessions),
    ...explicitSignals.flatMap((x) => learnerSignalToCognitiveObservations(x, x.source)),
  ];
  const cognition = summarizeCognition(observations);
  return {
    version: 1,
    learnerProfile: buildLearnerProfile(signals),
    cognition,
    policyDecision: chooseTeachingPolicy(cognition, policy),
    evidence: {
      sessions: sessions.length,
      attempts: signals.length,
      observations: observations.length,
      observed: observations.filter((x) => (x.source ?? "observed") === "observed").length,
      inferred: observations.filter((x) => x.source === "inferred").length,
    },
  };
}
