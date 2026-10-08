/**
 * Shared access policy for Web and the WeChat mini-program.
 *
 * Design constraints:
 * - No client-side payment status or "vip" flag is trusted.
 * - Publisher/source-display clearance is separate from user entitlements.
 * - Existing publicly accessible content remains available in rollout v1.
 * - Purchases and ownership are validated by server-side storage before a
 *   grant is supplied to this pure policy evaluator.
 */
export type IdentityKind = "anonymous" | "guest" | "student" | "parent" | "admin";
export type Plan = "free" | "plus" | "pro";

export type Capability =
  | "competition_catalog"
  | "public_sample_exam"
  | "arithmetic_basic"
  | "exam_basic"
  | "exam_premium"
  | "grading_basic"
  | "solution_basic"
  | "solution_ai"
  | "mistake_book"
  | "report_basic"
  | "report_advanced"
  | "report_pdf_basic"
  | "arithmetic_print_basic"
  | "arithmetic_print_personalized"
  | "competition_calendar"
  | "competition_reminder"
  | "awards_basic"
  | "awards_premium"
  | "family_dashboard"
  | "family_multi_student"
  | "personalized_exam"
  | "personalized_study_plan";

export type AccessGrant = {
  tier: Exclude<Plan, "free">;
  ownerId: string;
  /** Set only by the trusted order/entitlement store after verification. */
  verified: boolean;
  startsAt: number;
  expiresAt: number;
  revokedAt?: number | null;
};

export type AccessContext = {
  kind: IdentityKind;
  /** Server-resolved authenticated subject, never a client-provided claim. */
  accountId?: string;
  /** Server-resolved payer/family owner when a linked student is using a plan. */
  billingOwnerId?: string;
  /** Only populated after ownership / guardian relationship has been checked. */
  linkedStudentIds?: string[];
  grants?: ReadonlyArray<AccessGrant>;
  now?: number;
};

export type ResourceContext = {
  /** Access to any non-public source must always be denied. */
  sourceAllowed?: boolean;
  /** Optional resource owner, e.g. a report or student analytics record. */
  ownerStudentId?: string;
  /** Existing publicly available resource is kept free during rollout. */
  legacyPublic?: boolean;
};

export type AccessDecision = {
  allowed: boolean;
  reason: "allowed" | "login_required" | "upgrade_required" | "forbidden"
    | "source_unavailable";
  currentPlan: Plan;
  requiredPlan: Plan;
};

const CAPS: Record<Capability, {
  guest: boolean;
  free: boolean;
  requiredPlan: Plan;
  parentOnly?: boolean;
}> = {
  competition_catalog:             { guest: true,  free: true,  requiredPlan: "free" },
  public_sample_exam:              { guest: true,  free: true,  requiredPlan: "free" },
  arithmetic_basic:                { guest: true,  free: true,  requiredPlan: "free" },
  exam_basic:                      { guest: false, free: true,  requiredPlan: "free" },
  exam_premium:                    { guest: false, free: false, requiredPlan: "plus" },
  grading_basic:                   { guest: true,  free: true,  requiredPlan: "free" },
  solution_basic:                  { guest: true,  free: true,  requiredPlan: "free" },
  solution_ai:                     { guest: false, free: false, requiredPlan: "plus" },
  mistake_book:                    { guest: false, free: true,  requiredPlan: "free" },
  report_basic:                    { guest: true,  free: true,  requiredPlan: "free" },
  report_advanced:                 { guest: false, free: false, requiredPlan: "plus" },
  report_pdf_basic:                { guest: false, free: true,  requiredPlan: "free" },
  arithmetic_print_basic:         { guest: true,  free: true,  requiredPlan: "free" },
  arithmetic_print_personalized:  { guest: false, free: false, requiredPlan: "plus" },
  competition_calendar:           { guest: true,  free: true,  requiredPlan: "free" },
  competition_reminder:           { guest: false, free: true,  requiredPlan: "free" },
  awards_basic:                   { guest: true,  free: true,  requiredPlan: "free" },
  awards_premium:                 { guest: false, free: false, requiredPlan: "plus" },
  family_dashboard:               { guest: false, free: true,  requiredPlan: "free", parentOnly: true },
  family_multi_student:           { guest: false, free: false, requiredPlan: "plus", parentOnly: true },
  personalized_exam:              { guest: false, free: false, requiredPlan: "plus" },
  personalized_study_plan:        { guest: false, free: false, requiredPlan: "plus" },
};
export const ACCESS_POLICY_VERSION = "2026-10-08-v2";
export const CAPABILITIES = Object.freeze(Object.keys(CAPS) as Capability[]);

export function classifyStudentIdentity(user: {
  id: string;
  role: "admin" | "student";
} | null | undefined): IdentityKind {
  if (!user) return "anonymous";
  if (user.role === "admin") return "admin";
  if (user.id.startsWith("guest_")) return "guest";
  return "student";
}

export function effectivePlan(ctx: AccessContext): Plan {
  if (ctx.kind === "anonymous" || ctx.kind === "guest") return "free";
  const at = ctx.now ?? Date.now();
  const owners = new Set([ctx.accountId, ctx.billingOwnerId].filter(Boolean));
  let tier: Plan = "free";
  for (const grant of ctx.grants ?? []) {
    if (!grant.verified || !owners.has(grant.ownerId)) continue;
    if (grant.startsAt > at || grant.expiresAt <= at) continue;
    if (grant.revokedAt !== undefined && grant.revokedAt !== null && grant.revokedAt <= at) continue;
    if (grant.tier === "pro") return "pro";
    tier = "plus";
  }
  return tier;
}

export function maxFamilyStudents(tier: Plan): number {
  return tier === "pro" ? 5 : tier === "plus" ? 3 : 1;
}

/** Pure policy decision. Caller MUST supply source clearance and owner checks. */
export function canAccess(
  capability: Capability,
  ctx: AccessContext,
  resource: ResourceContext = {},
): AccessDecision {
  const rule = CAPS[capability];
  const plan = effectivePlan(ctx);
  const deny = (reason: AccessDecision["reason"]): AccessDecision =>
    ({ allowed: false, reason, currentPlan: plan, requiredPlan: rule.requiredPlan });
  if (resource.sourceAllowed === false) return deny("source_unavailable");
  if (resource.ownerStudentId) {
    const owns = ctx.kind === "student" && resource.ownerStudentId === ctx.accountId;
    const guardianOwns = ctx.kind === "parent" && (ctx.linkedStudentIds ?? []).includes(resource.ownerStudentId);
    if (!owns && !guardianOwns) return deny("forbidden");
  }
  if (rule.parentOnly && ctx.kind !== "parent") return deny("forbidden");
  if (ctx.kind === "anonymous") return rule.guest
    ? { allowed: true, reason: "allowed", currentPlan: plan, requiredPlan: rule.requiredPlan }
    : deny("login_required");
  if (ctx.kind === "guest") return rule.guest
    ? { allowed: true, reason: "allowed", currentPlan: plan, requiredPlan: rule.requiredPlan }
    : deny("login_required");
  if (resource.legacyPublic) return { allowed: true, reason: "allowed", currentPlan: plan, requiredPlan: "free" };
  const rank: Record<Plan, number> = { free: 0, plus: 1, pro: 2 };
  if (rule.free || rank[plan] >= rank[rule.requiredPlan]) {
    return { allowed: true, reason: "allowed", currentPlan: plan, requiredPlan: rule.requiredPlan };
  }
  return deny("upgrade_required");
}
