import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {billingConfigured,billingPool} from "@/lib/billing-ledger";
import {nativeSettlementAllowed} from "@/lib/wechat-native-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
const reply=(data:object,status:number)=>NextResponse.json(data,{status,headers});

/** User-owned order polling: no payment success is trusted from the client. */
export async function GET(req:NextRequest,ctx:{params:Promise<{orderId:string}>}) {
  if (!nativeSettlementAllowed() || !billingConfigured()) return reply({code:"WEB_NATIVE_DISABLED"},503);
  const parent=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!parent || !parent.active) return reply({error:"请登录家长账号"},401);
  const {orderId}=await ctx.params;
  if (!/^ord_[a-zA-Z0-9_-]{6,28}$/.test(orderId)) return reply({error:"订单不存在"},404);
  try {
    const result=await billingPool().query<{id:string;state:string;price_minor:string;currency:string}>(
      "SELECT id,state,price_minor,currency FROM billing_orders WHERE id=$1 AND payer_parent_id=$2 AND provider='wechat_native'",
      [orderId,parent.id]);
    const order=result.rows[0];
    if (!order) return reply({error:"订单不存在"},404);
    return reply({orderId:order.id,status:order.state,priceMinor:Number(order.price_minor),
      currency:order.currency},200);
  } catch {return reply({code:"ORDER_LOOKUP_UNAVAILABLE"},503);}
}
