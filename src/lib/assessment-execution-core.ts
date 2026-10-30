import { createHash } from "node:crypto";
import type { AssessmentBlueprintContract, ScoringEvidenceContract } from "./assessment-core-contract";

/**
 * Server-side cross-domain assessment execution boundary (P1).
 *
 * This is a pure, side-effect-free execution kernel. It does NOT own auth,
 * orders, durable attempts, grading implementations, or sandboxes. The calling
 * server must bind the attempt to a verified session, enforce entitlements,
 * persist the immutable submission before evaluation, and commit the result
 * transactionally. Never expose this module as a client scoring endpoint.
 */
export type AnswerSnapshot = Readonly<Record<string, string>>;
export type AssessmentSubmission = Readonly<{
  attemptId: string;
  actorId: string;
  blueprintId: string;
  blueprintRevision: number;
  submittedAt: string;
  answers: AnswerSnapshot;
}>;

export type ItemEvaluation = Readonly<{
  itemId: string;
  itemRevision: number;
  evaluatorVersion: string;
  rubricVersion: string;
  evidenceRef: string;
  score?: number;
  maxScore?: number;
  uncertainty?: string;
  reviewedBy?: string;
}>;

export type AssessmentEvaluation = Readonly<{
  attemptId: string;
  blueprintId: string;
  blueprintRevision: number;
  mode: AssessmentBlueprintContract["gradingMode"];
  submissionDigest: string;
  scoredAt: string;
  score: number | null;
  maxScore: number | null;
  evidence: readonly (ScoringEvidenceContract & { itemId: string })[];
}>;

export type AssessmentEvaluator = (
  blueprint: AssessmentBlueprintContract,
  submission: AssessmentSubmission,
) => Promise<readonly ItemEvaluation[]>;

const safeId = (id: string) => /^[a-zA-Z0-9_.:-]{4,150}$/.test(id);
const validNumber = (value: number) => Number.isFinite(value) && value >= 0;

function requireValidSubmission(blueprint: AssessmentBlueprintContract, submission: AssessmentSubmission) {
  if (!safeId(submission.attemptId) || !safeId(submission.actorId)) throw new Error("invalid-attempt-identity");
  if (submission.blueprintId !== blueprint.id || submission.blueprintRevision !== blueprint.revision)
    throw new Error("blueprint-version-mismatch");
  if (!blueprint.itemRefs.length || !Number.isInteger(blueprint.revision) || blueprint.revision < 1)
    throw new Error("invalid-blueprint");
  if (!Number.isFinite(Date.parse(submission.submittedAt)))
    throw new Error("invalid-submission-time");
  const ids = blueprint.itemRefs.map(ref => ref.id);
  if (ids.length !== new Set(ids).size || blueprint.itemRefs.some(x => !safeId(x.id) || !Number.isInteger(x.revision) || x.revision < 1))
    throw new Error("invalid-item-references");
  if (Object.keys(submission.answers).some(id => !ids.includes(id) || typeof submission.answers[id] !== "string"))
    throw new Error("unknown-or-invalid-answer");
}

/** Fixed key order: reproducible across worker instances and retry attempts. */
export function assessmentSubmissionDigest(
  blueprint: AssessmentBlueprintContract,
  submission: AssessmentSubmission,
): string {
  requireValidSubmission(blueprint, submission);
  const answers = blueprint.itemRefs.map(({ id, revision }) => [id, revision, submission.answers[id] ?? null]);
  return createHash("sha256").update(JSON.stringify({
    attemptId: submission.attemptId, actorId: submission.actorId,
    blueprintId: blueprint.id, blueprintRevision: blueprint.revision,
    submittedAt: submission.submittedAt, answers,
  })).digest("hex");
}

/**
 * Runs an injected trusted evaluator against the exact, already authorized and
 * committed attempt snapshot. Only trusted server evaluators may be injected.
 * The caller must persist the returned evaluation atomically and idempotently.
 */
export async function evaluateAssessment(
  blueprint: AssessmentBlueprintContract,
  submission: AssessmentSubmission,
  evaluator: AssessmentEvaluator,
  options: { authorized: boolean; persistedSnapshotDigest: string; scoredAt: string },
): Promise<AssessmentEvaluation> {
  if (!options.authorized) throw new Error("assessment-access-denied");
  const digest = assessmentSubmissionDigest(blueprint, submission);
  if (options.persistedSnapshotDigest !== digest) throw new Error("attempt-snapshot-mismatch");
  if (!Number.isFinite(Date.parse(options.scoredAt))) throw new Error("invalid-evaluation-time");

  const snapshot = Object.freeze({ ...submission, answers: Object.freeze({ ...submission.answers }) });
  const evaluated = await evaluator(blueprint, snapshot);
  if (assessmentSubmissionDigest(blueprint, snapshot) !== digest)
    throw new Error("attempt-mutated-during-evaluation");
  const byId = new Map(blueprint.itemRefs.map(x => [x.id, x.revision]));
  if (evaluated.length !== byId.size || new Set(evaluated.map(x => x.itemId)).size !== byId.size)
    throw new Error("incomplete-or-duplicate-evidence");

  const evidence: (ScoringEvidenceContract & { itemId: string })[] = [];
  for (const e of evaluated) {
    if (!byId.has(e.itemId) || byId.get(e.itemId) !== e.itemRevision)
      throw new Error("evidence-item-revision-mismatch");
    if (!e.evaluatorVersion || !e.rubricVersion || !e.evidenceRef)
      throw new Error("missing-evaluation-provenance");
    const scored = blueprint.gradingMode !== "non-scored-scale";
    if (scored && (e.score === undefined || e.maxScore === undefined ||
      !validNumber(e.score) || !validNumber(e.maxScore) || e.score > e.maxScore))
      throw new Error("invalid-item-score");
    if (!scored && (e.score !== undefined || e.maxScore !== undefined))
      throw new Error("non-scored-scale-must-not-return-marks");
    if (blueprint.gradingMode === "rubric-reviewed" && !e.reviewedBy)
      throw new Error("rubric-review-missing");
    evidence.push({
      itemId: e.itemId,
      blueprintRevision: blueprint.revision,
      itemRevision: e.itemRevision,
      scoringMode: blueprint.gradingMode,
      evaluatorVersion: e.evaluatorVersion,
      rubricVersion: e.rubricVersion,
      evidenceRef: e.evidenceRef,
      ...(e.score === undefined ? {} : { score: e.score }),
      ...(e.maxScore === undefined ? {} : { maxScore: e.maxScore }),
      ...(e.uncertainty ? { uncertainty: e.uncertainty } : {}),
      ...(e.reviewedBy ? { reviewedBy: e.reviewedBy } : {}),
    });
  }
  const ordered = blueprint.itemRefs.map(ref => evidence.find(e => e.itemId === ref.id)!);
  const scored = blueprint.gradingMode !== "non-scored-scale";
  const score = scored ? ordered.reduce((sum, e) => sum + e.score!, 0) : null;
  const maxScore = scored ? ordered.reduce((sum, e) => sum + e.maxScore!, 0) : null;
  if (scored && blueprint.totalPoints !== undefined && Math.abs(maxScore! - blueprint.totalPoints) > 0.000001)
    throw new Error("score-maximum-blueprint-mismatch");
  return {
    attemptId: submission.attemptId,
    blueprintId: blueprint.id,
    blueprintRevision: blueprint.revision,
    mode: blueprint.gradingMode,
    submissionDigest: digest,
    scoredAt: options.scoredAt,
    score, maxScore,
    evidence: ordered,
  };
}
