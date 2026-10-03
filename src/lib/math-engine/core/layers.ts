import type {
  LearningGoal,
  MasteryStage,
  MathEntity,
  MathTransformation,
  RepresentationKind,
  TrainingPolicy,
} from "./model";

export type SemanticInvariant = {
  id: string;
  description: string;
  check?: "exact" | "symbolic" | "numeric" | "human_review";
};

export type MathSemanticState = {
  entity: MathEntity;
  activeRepresentationId?: string;
  invariants: SemanticInvariant[];
  legalTransformations: MathTransformation[];
};

export type CognitivePrimitive =
  | "perceive"
  | "represent"
  | "chunk"
  | "transform"
  | "search"
  | "evaluate"
  | "execute"
  | "verify"
  | "reflect"
  | "transfer";

export type EvidenceSource = "observed" | "inferred";

export type CognitiveObservation = {
  primitive: CognitivePrimitive;
  entityId: string;
  representationKind?: RepresentationKind;
  strategyId?: string;
  stage?: MasteryStage;
  latencyMs?: number;
  success?: boolean;
  hintLevel?: number;
  transformationIds?: string[];
  source?: EvidenceSource;
  confidence?: number;
  timestamp: number;
};

export type TeachingPolicyDecision = {
  policy: TrainingPolicy;
  targetGoals: LearningGoal[];
  intervention: "none" | "attention_hint" | "representation_hint" | "transformation_hint" | "worked_example" | "transfer_probe";
  reason: string;
};
