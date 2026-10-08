import type { PublicStudent } from "./auth";
import { canAccess, classifyStudentIdentity } from "./access-policy";

/** Server-side full-exam guard, shared by exam entry and all exam APIs.
 * Guest preview rights must never imply full-exam rights.
 */
export function hasFullExamAccess<T extends Pick<PublicStudent,"id"|"role">>(user: T | null | undefined): user is T {
  if (!user) return false;
  const kind = classifyStudentIdentity(user);
  return canAccess("exam_basic", {kind, accountId:user.id}).allowed;
}
