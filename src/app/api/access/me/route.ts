import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { PARENT_SESSION_COOKIE, parentFromSessionToken } from "@/lib/parent-auth";
import {
  ACCESS_POLICY_VERSION,
  CAPABILITIES,
  canAccess,
  classifyStudentIdentity,
  effectivePlan,
  type AccessContext,
} from "@/lib/access-policy";

/**
 * Read-only feature-discovery endpoint shared by the Web and mini-program.
 *
 * This is intentionally in preview mode until a verified transactional
 * entitlement ledger is installed. It never trusts client-supplied plan flags
 * and does not claim anyone has paid.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const student = userFromRequest(req);
  const parent = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  const preferParent = req.nextUrl.searchParams.get("identity") === "parent";
  const useParent = Boolean(parent && (preferParent || !student || classifyStudentIdentity(student) === "guest"));

  const context: AccessContext = useParent && parent
    ? { kind: "parent", accountId: parent.id }
    : student
      ? { kind: classifyStudentIdentity(student), accountId: student.id }
      : parent
        ? { kind: "parent", accountId: parent.id }
        : { kind: "anonymous" };

  const capabilities = Object.fromEntries(CAPABILITIES.map(capability => [
    capability,
    canAccess(capability, context),
  ]));
  return NextResponse.json(
    {
      policyVersion: ACCESS_POLICY_VERSION,
      policyMode: "preview",
      identity: context.kind,
      plan: effectivePlan(context),
      maxFamilyStudents: context.kind === "parent" ? 1 : null,
      capabilities,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie, Authorization" } },
  );
}
