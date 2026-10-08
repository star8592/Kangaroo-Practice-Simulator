import { familyOwnsStudent, publicFamilyStudents } from "./family-store";
import { billingConfigured, verifiedGrantsForParent, verifiedParentsForStudent } from "./billing-ledger";
import { effectivePlan, type AccessContext, type AccessGrant } from "./access-policy";

/**
 * Build authoritative feature-discovery context from server-validated user ID.
 * Never accept user/customer/tier/parent IDs supplied in query parameters.
 *
 * Billing is read-only and opt-in while policyMode remains preview.
 */
export async function attachVerifiedBilling(base: AccessContext): Promise<AccessContext> {
  if (!billingConfigured()) return base;
  if (base.kind === "parent" && base.accountId) {
    const linkedStudentIds = publicFamilyStudents(base.accountId).map(x => x.id);
    const grants = await verifiedGrantsForParent(base.accountId);
    return { ...base, linkedStudentIds, grants };
  }
  if (base.kind !== "student" || !base.accountId) return base;
  // Require agreement of the existing family store AND transactional link
  // before a student can inherit a guardian's paid entitlement.
  const parentIds = (await verifiedParentsForStudent(base.accountId))
    .filter(parentId => familyOwnsStudent(parentId, base.accountId!));
  let selectedOwner: string | undefined;
  let selectedGrants: AccessGrant[] = [];
  let currentRank = 0;
  for (const parentId of parentIds) {
    const grants = await verifiedGrantsForParent(parentId);
    const candidate: AccessContext = { ...base, billingOwnerId: parentId, grants };
    const tier = effectivePlan(candidate);
    const rank = tier === "pro" ? 2 : tier === "plus" ? 1 : 0;
    if (rank > currentRank) {
      currentRank = rank;
      selectedOwner = parentId;
      selectedGrants = grants;
    }
  }
  return { ...base, billingOwnerId: selectedOwner, grants: selectedGrants };
}
