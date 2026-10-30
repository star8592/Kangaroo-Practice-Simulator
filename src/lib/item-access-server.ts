import { NextRequest, NextResponse } from "next/server";
import { PARENT_SESSION_COOKIE, parentFromSessionToken } from "./parent-auth";
import { billingConfigured, billingPool, hasVerifiedItemEntitlement } from "./billing-ledger";

/**
 * Server-side exam item gate. Existing exams remain free to an authenticated
 * user unless explicitly designated as a paid SKU. Never trust a client
 * productId, accountId, paid flag, or a miniapp OpenID from another AppID.
 *
 * SOCTHINK_ITEM_ACCESS_ENFORCED is an activation LATCH, not a checkout toggle.
 * Once any item is sold, keep it on even when pausing new sales.
 */
export async function canOpenItemExam(examId: string, verifiedBuyerId: string | null): Promise<boolean> {
  // Once a billing DB exists, always inspect its paid-content rows, even
  // if an operator mistakenly clears the activation flag later. A sold item
  // must never become free solely because new checkout was paused.
  if (!billingConfigured()) {
    if (process.env.SOCTHINK_ITEM_ACCESS_ENFORCED === "1")
      throw new Error("ITEM_BILLING_UNAVAILABLE");
    return true;
  }
  if (!examId || examId.length > 200) return false;
  const res = await billingPool().query<{restricted:boolean}>(`
    SELECT (
      EXISTS(SELECT 1 FROM billing_products p
        WHERE p.product_kind='item' AND p.content_kind='exam'
          AND p.content_id=$1 AND p.access_restricted=true)
      OR EXISTS(SELECT 1 FROM billing_orders o
        WHERE o.product_kind='item' AND o.content_kind='exam'
          AND o.content_id=$1 AND o.state IN ('paid','refunded'))
    ) AS restricted`,[examId]);
  if (!res.rows[0]?.restricted) return true;
  return verifiedBuyerId !== null &&
    await hasVerifiedItemEntitlement(verifiedBuyerId,"exam",examId);
}

export function verifiedBuyerIdForItem(req: NextRequest): string | null {
  // Miniapp Bearer identity is intentionally NOT equivalent to website OAuth.
  if(req.headers.get("authorization")?.startsWith("Bearer ")) return null;
  const account=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  return account?.active&&(account.wechatId||account.wechatOpenId)?account.id:null;
}

export async function deniedItemExamResponse(req: NextRequest, examId: string): Promise<NextResponse | null> {
  try{
    const allowed=await canOpenItemExam(examId,verifiedBuyerIdForItem(req));
    if(allowed)return null;
    return NextResponse.json({error:"请先购买本张试卷",code:"ITEM_PAYMENT_REQUIRED"},
      {status:403,headers:{"Cache-Control":"private, no-store"}});
  }catch{
    return NextResponse.json({error:"购买权益暂时无法核验",code:"ITEM_BILLING_UNAVAILABLE"},
      {status:503,headers:{"Cache-Control":"private, no-store"}});
  }
}
