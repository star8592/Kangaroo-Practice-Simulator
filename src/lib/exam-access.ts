import type {PublicStudent} from "./auth";
import {canAccess,classifyStudentIdentity} from "./access-policy";

/** Full-exam entitlement is identical for a registered learner, a verified
 * WeChat household learner, and native WeChat miniapp identity. Only anonymous
 * and ephemeral guest sessions are excluded. Callers resolve signed tokens.
 */
export function hasFullExamAccess<T extends Pick<PublicStudent,"id"|"role">>(user:T|null|undefined):user is T {
  if(!user)return false;
  return canAccess("exam_basic",{kind:classifyStudentIdentity(user),accountId:user.id}).allowed;
}

/** Compatibility wrappers preserve the shared authorization check on all
 * routes; paper IDs do not bypass authentication or payment entitlements. */
export function canAccessExamProfile<T extends Pick<PublicStudent,"id"|"role">>(user:T|null|undefined,_profile:{id:string}):user is T {
  void _profile;
  return hasFullExamAccess(user);
}
export function canAccessExamId<T extends Pick<PublicStudent,"id"|"role">>(user:T|null|undefined,_examId:string):user is T {
  void _examId;
  return hasFullExamAccess(user);
}
