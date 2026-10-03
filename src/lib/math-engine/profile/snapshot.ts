import type { ArithmeticSession } from "../../arithmetic-analytics";
import type { TrainingPolicy } from "../core/model";
import { arithmeticAttemptToSignal } from "../adapters/arithmetic";
import { arithmeticSessionsToCognitiveObservations } from "../adapters/arithmetic-cognition";
import { summarizeCognition } from "../cognition/state";
import { chooseTeachingPolicy } from "../policy/coach";
import { buildLearnerProfile } from "./learner";

export function buildMathEngineSnapshot(
  sessions: ArithmeticSession[],
  policy: TrainingPolicy = "discovery",
) {
  const signals = sessions.flatMap((session) => session.attempts.map(arithmeticAttemptToSignal));
  const observations = arithmeticSessionsToCognitiveObservations(sessions);
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
