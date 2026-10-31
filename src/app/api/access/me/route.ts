import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { PARENT_SESSION_COOKIE, parentFromSessionToken } from "@/lib/parent-auth";
import { attachVerifiedBilling } from "@/lib/access-context-server";
import { billingConfigured } from "@/lib/billing-ledger";
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
  const buyer = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  // The public entitlement holder is the signed-in WeChat account. Existing
  // legacy student sessions continue to work for historical records only.
  const identity:AccessContext=buyer?.active&&(buyer.wechatId||buyer.wechatOpenId)
    ? {kind:"parent",accountId:buyer.id}
    : student ? {kind:classifyStudentIdentity(student),accountId:student.id}
    : {kind:"anonymous"};

  // Billing database errors must not silently misrepresent a paying family
  // as free. Existing public learning APIs do not call this endpoint.
  let context: AccessContext;
  try {
    context = await attachVerifiedBilling(identity);
  } catch {
    return NextResponse.json(
      { error: "会员权益暂时无法查询，请稍后重试", code: "BILLING_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const capabilities = Object.fromEntries(CAPABILITIES.map(capability => [
    capability,
    canAccess(capability, context),
  ]));
  return NextResponse.json(
    {
      policyVersion: ACCESS_POLICY_VERSION,
      policyMode: "preview",
      ledgerConfigured: billingConfigured(),
      identity: context.kind,
      plan: effectivePlan(context),
      accountModel: "single-wechat-buyer",
      capabilities,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie, Authorization" } },
  );
}
