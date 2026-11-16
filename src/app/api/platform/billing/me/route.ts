import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {billingConfigured,billingPool,verifiedGrantsForParent} from "@/lib/billing-ledger";
import {effectivePlan} from "@/lib/access-policy";

/** Verified per-account monetary entitlements, not teacher management roles.
 * Paid orders/rights are authoritative. Other English modules remain closed
 * until real SKU fulfillment is integrated and tested.
 */
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store, max-age=0","Vary":"Cookie"};
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers});

export async function GET(req:NextRequest){
  const user=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if(!user?.active||!(user.wechatId||user.wechatOpenId))
    return json({code:"WECHAT_LOGIN_REQUIRED"},401);
  if(!billingConfigured())
    return json({code:"PLATFORM_BILLING_UNAVAILABLE"},503);
  try{
    const [plans,items]=await Promise.all([
      verifiedGrantsForParent(user.id),
      billingPool().query<{content_kind:"exam"|"resource"|"report";content_id:string}>(
        "SELECT DISTINCT e.content_kind,e.content_id" +
        " FROM billing_item_entitlements e" +
        " JOIN billing_orders o ON o.id=e.source_order_id" +
        " WHERE e.payer_parent_id=$1 AND o.payer_parent_id=$1" +
        " AND o.state='paid' AND e.revoked_at IS NULL" +
        " ORDER BY e.content_kind,e.content_id LIMIT 200",[user.id]),
    ]);
    return json({
      model:"one-wechat-identity-one-payment-ledger",
      plan:effectivePlan({kind:"parent",accountId:user.id,grants:plans}),
      entitlements:{
        // Existing mixed-platform report/resource/exam purchases have no
        // module ownership column. Never misattribute these to mathematics.
        platform:{items:items.rows.map(r=>({kind:r.content_kind,id:r.content_id}))},
        math:{plan:effectivePlan({kind:"parent",accountId:user.id,grants:plans})},
        // Teacher grants never masquerade as paid module subscriptions.
        pronunciation:{state:"not-onboarded"},vocabulary:{state:"not-onboarded"},
        reading:{state:"not-onboarded"},aelos:{state:"not-onboarded"},
      },
    });
  }catch{return json({code:"PLATFORM_BILLING_UNAVAILABLE"},503)}
}
