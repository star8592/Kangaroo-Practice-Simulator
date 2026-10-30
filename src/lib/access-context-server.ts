import { familyParentForStudent, publicFamilyStudents } from "./family-store";
import { billingConfigured, verifiedGrantsForParent } from "./billing-ledger";
import { effectivePlan, maxFamilyStudents, type AccessContext } from "./access-policy";

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
  // A guardian is already authenticated when creating a child, or both
  // guardian session and existing student's PIN are validated when linking.
  // Do not require a shadow PG family_links row which these verified routes
  // never wrote. Billing DB remains authoritative ONLY for paid grants.
  const parentId=familyParentForStudent(base.accountId);
  if (!parentId) return base;
  const grants=await verifiedGrantsForParent(parentId);
  return { ...base, billingOwnerId:parentId, grants };

}


/** Null keeps existing pre-billing family behavior intact.
 * When the one official paid ledger is installed, enforce real family seats
 * on future new child creation/link; never silently unlink legacy children.
 */
export async function paidFamilySeatLimit(parentId:string):Promise<number|null> {
  if (!billingConfigured()) return null;
  const grants=await verifiedGrantsForParent(parentId);
  return maxFamilyStudents(effectivePlan({
    kind:"parent",accountId:parentId,grants,
  }));
}

export function familySeatAvailable(
  existingStudentIds:readonly string[],studentId:string|null,limit:number|null,
):boolean {
  if(studentId && existingStudentIds.includes(studentId)) return true;
  if(limit===null)return true;
  if(!Number.isInteger(limit)||limit<1)return false;
  return new Set(existingStudentIds).size<limit;
}
