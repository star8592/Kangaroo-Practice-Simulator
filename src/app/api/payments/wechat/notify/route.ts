import {NextRequest,NextResponse} from "next/server";
import {billingPool,settleVerifiedOrder} from "@/lib/billing-ledger";
import {decryptWechatV3Resource,validateOfficialWechatPaidTrade,verifyWechatV3Notification} from "@/lib/wechat-native-payment";
import {nativeApiV3Key,nativeSettlementAllowed,nativeServerContext} from "@/lib/wechat-native-server";
import {queryVerifiedWechatNativePayment} from "@/lib/wechat-native-transport";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const reply=(status:number)=>new NextResponse(null,{status,headers});

/** Public WeChat Pay callback: never attach user/session middleware.
 * It MUST authenticate the exact raw bytes and requery the official API
 * before granting a single transaction in the existing PostgreSQL ledger.
 */
export async function POST(req:NextRequest) {
  if (!nativeSettlementAllowed()) return reply(503);
  try {
    const raw=await req.text();
    if (Buffer.byteLength(raw,"utf8")>65536) return reply(413);
    const context=nativeServerContext(process.env,Math.floor(Date.now()/1000),"reconciliation");
    const proof=verifyWechatV3Notification({
      headers:Object.fromEntries(req.headers.entries()),
      rawBody:raw,
      wechatPayPublicKey:context.wechatPayPublicKey,
      expectedWechatPaySerial:context.wechatPayPublicKeyId,
      nowSeconds:context.nowSeconds,
    });
    if (!proof.ok || !proof.payloadSha256) return reply(401);
    const event:unknown=JSON.parse(raw);
    if (!event || typeof event!=="object" || Array.isArray(event)) return reply(400);
    const envelope=event as Record<string,unknown>;
    if (envelope.event_type!=="TRANSACTION.SUCCESS" ||
      envelope.resource_type!=="encrypt-resource" ||
      typeof envelope.id!=="string" || envelope.id.length<1 || envelope.id.length>256)
      return reply(400);
    const resource=envelope.resource;
    if (!resource || typeof resource!=="object" || Array.isArray(resource)) return reply(400);
    const r=resource as Record<string,unknown>;
    if (typeof r.algorithm!=="string"||typeof r.ciphertext!=="string"||
      typeof r.nonce!=="string"||(r.associated_data!==undefined&&typeof r.associated_data!=="string"))
      return reply(400);
    const trade=decryptWechatV3Resource({
      algorithm:r.algorithm,ciphertext:r.ciphertext,nonce:r.nonce,
      associated_data:r.associated_data as string|undefined,
    },nativeApiV3Key());
    if (typeof trade.out_trade_no!=="string" ||
      !/^ord_[a-zA-Z0-9_-]{6,28}$/.test(trade.out_trade_no))
      return reply(400);
    const rows=await billingPool().query<{
      id:string;provider:string;price_minor:string;currency:string;state:string;
    }>("SELECT id,provider,price_minor,currency,state FROM billing_orders WHERE id=$1",
      [trade.out_trade_no]);
    const order=rows.rows[0];
    if (!order || order.provider!=="wechat_native" || order.currency!=="CNY" ||
        !["pending","paid"].includes(order.state)) return reply(409);
    const expected={
      merchantId:context.merchant.merchantId,appId:context.merchant.appId,
      orderId:order.id,amountMinor:Number(order.price_minor),
    };
    if (!validateOfficialWechatPaidTrade({trade,expected}).ok) return reply(409);
    // This independently verifies the signature of WeChat's direct GET reply.
    const query=await queryVerifiedWechatNativePayment(context,{
      orderId:order.id,description:"not_used_for_query",
      amountMinor:expected.amountMinor,currency:"CNY",
    });
    if (query.status!=="VERIFIED_PAID" ||
      typeof query.transactionId!=="string" ||
      query.transactionId!==trade.transaction_id)
      return reply(409);
    await settleVerifiedOrder({
      provider:"wechat_native",
      eventId:envelope.id,
      orderId:order.id,
      transactionId:query.transactionId,
      amountMinor:expected.amountMinor,currency:"CNY",
      payloadSha256:proof.payloadSha256,
      verifiedAt:new Date(),
      signatureVerified:true,
      providerStatusConfirmed:true,
    });
    return reply(204);
  } catch {
    // Non-2xx lets WeChat retry safely; details stay out of public logs.
    return reply(503);
  }
}

/* Deliberate: no GET webhook and no merchant values emitted publicly. */
