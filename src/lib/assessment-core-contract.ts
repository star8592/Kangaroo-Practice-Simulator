import type { AssessmentDomainId, AssessmentFormat } from "./assessment-platform";

/** Shared specification for future native assessments and existing domain adapters. */
export type SourceRights = "original" | "licensed" | "public-domain" | "private-only" | "unverified";
export type SourceEvidence = {
  sourceId: string;
  originUrl?: string;
  publisher?: string;
  retrievedAt: string;
  originalHash: string;
  rights: SourceRights;
  licenseEvidence?: string;
};
export type ContentQuality = "candidate" | "extracted" | "answer-verified" | "publishable" | "withdrawn";
export type AssessmentItemContract = {
  id: string;
  revision: number;
  domain: AssessmentDomainId;
  format: AssessmentFormat;
  stem: string;
  source: SourceEvidence;
  quality: ContentQuality;
  answerEvidenceId: string;
  scoringRubricVersion: string;
  solutionVersion?: number;
};
export type AssessmentBlueprintContract = {
  id: string;
  revision: number;
  domain: AssessmentDomainId;
  title: string;
  itemRefs: readonly {id: string; revision: number}[];
  gradingMode: "deterministic" | "rubric-reviewed" | "isolated-execution" | "non-scored-scale";
  timeLimitSeconds?: number;
  totalPoints?: number;
};
export type ScoringEvidenceContract = {
  scoringMode: AssessmentBlueprintContract["gradingMode"];
  blueprintRevision: number;
  itemRevision: number;
  evaluatorVersion: string;
  rubricVersion: string;
  evidenceRef: string;
  reviewedBy?: string;
  score?: number;
  maxScore?: number;
  uncertainty?: string;
};
export type SolutionMediaContract = {
  itemId: string;
  itemRevision: number;
  answerEvidenceId: string;
  kind: "steps"|"svg"|"narration"|"video"|"interactive";
  verifiedAt: string;
  assetRef: string;
  sourceRights: SourceRights;
};
export type PurchaseScope = "free"|"single-assessment"|"assessment-pack"|"subscription"|"organization";
export type AccessEntitlementContract = {
  scope: PurchaseScope;
  capabilityId: string;
  grantId?: string;
  startsAt?: string;
  expiresAt?: string;
  remainingUnits?: number;
};
/**
 * No public publishing until source rights and correct-answer verification
 * are both explicit. OCR-ing a question never grants redistribution rights.
 */
export function publishableItemErrors(item: AssessmentItemContract): string[] {
  const errors:string[]=[];
  if(!/^[A-Za-z0-9_.:-]{4,150}$/.test(item.id)) errors.push("invalid-id");
  if(!Number.isInteger(item.revision)||item.revision<1) errors.push("invalid-revision");
  if(item.quality!=="publishable") errors.push("quality-unverified");
  if(["unverified","private-only"].includes(item.source.rights)) errors.push("rights-not-public");
  if(item.source.rights==="licensed"&&!item.source.licenseEvidence) errors.push("license-unverified");
  if(!/^[0-9a-f]{64}$/i.test(item.source.originalHash)) errors.push("missing-source-hash");
  if(!item.answerEvidenceId||!item.scoringRubricVersion) errors.push("missing-scoring-evidence");
  return errors;
}
export function hasValidBlueprintItems(
  blueprint: AssessmentBlueprintContract,
  items: readonly AssessmentItemContract[],
): boolean {
  if(blueprint.itemRefs.length===0||blueprint.revision<1) return false;
  const byId=new Map(items.map(x=>[x.id,x]));
  return blueprint.itemRefs.every(({id,revision})=>{
    const item=byId.get(id);
    return item!==undefined && item.revision===revision && item.domain===blueprint.domain &&
      publishableItemErrors(item).length===0;
  });
}
