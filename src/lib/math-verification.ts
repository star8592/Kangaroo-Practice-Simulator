import rawIndex from "./generated/math-verification-index.json";
import type { MathVerification } from "./types";

type RawItem = {
  problem_id: string; status: MathVerification["status"]; method: MathVerification["method"];
  competition?: string | null; year?: number | null; domain?: string | null;
  proof_source?: string | null; source_sha256?: string | null; lean_toolchain?: string | null;
  mathlib_revision?: string | null; verifier_revision?: string | null; verified_at?: string | null;
};
const items = (rawIndex.items as RawItem[]).map((x) => [x.problem_id, {
  status:x.status, method:x.method, competition:x.competition, year:x.year, domain:x.domain,
  proofSource:x.proof_source, sourceSha256:x.source_sha256, leanToolchain:x.lean_toolchain,
  mathlibRevision:x.mathlib_revision, verifierRevision:x.verifier_revision, verifiedAt:x.verified_at,
} satisfies MathVerification] as const);
const byId = new Map(items);
export function mathVerificationForQuestion(id:string){ return byId.get(id); }
export function verifiedMathItems(){ return Array.from(byId.entries()).map(([problemId,verification])=>({problemId,verification})); }
export const verifiedMathCount = byId.size;
