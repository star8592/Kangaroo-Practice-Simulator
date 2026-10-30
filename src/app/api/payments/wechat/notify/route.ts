import {NextRequest,NextResponse} from "next/server";
import {recordVerifiedNativeNotification} from "@/lib/billing-ledger";
import {decryptWechatV3Resource,validateOfficialWechatPaidTrade,verifyWechatV3Notification} from "@/lib/wechat-native-payment";
import {nativeApiV3Key,nativeSettlementAllowed,nativeServerContext} from "@/lib/wechat-native-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const reply=(status:number)=>new NextResponse(null,{status,headers});

/** Public WeChat Pay callback: never attach user/session middleware.
 * Verify exact raw signed bytes, validate the decrypted trade, durably
 * store the claim in the existing ledger, then ACK promptly. A separate
 * official-query recovery worker verifies and grants payment entitlements.
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
    // The total is sourced from the already authenticated WeChat callback,
    // never from the client. The single atomic UPDATE below independently
    // matches this amount against the immutable local PostgreSQL order.
    const amount=trade.amount;
    const total=amount && typeof amount==="object" && !Array.isArray(amount)
      ? (amount as Record<string,unknown>).total : undefined;
    if(typeof total!=="number" || !Number.isSafeInteger(total) || total<=0)
      return reply(400);
    const expected={
      merchantId:context.merchant.merchantId,
      appId:context.merchant.appId,
      orderId:trade.out_trade_no,
      amountMinor:total,
    };
    if (!validateOfficialWechatPaidTrade({trade,expected}).ok) return reply(409);
    // Durable, locally authenticated callback proof before ACK. No slow
    // provider GET and no entitlement grant on the 5-second notification path.
    // Existing reconciliation worker performs official signed GET and the
    // atomic settlement; DB failure returns 503 so WeChat will retry.
    if (typeof trade.transaction_id!=="string" ||
        !/^[A-Za-z0-9_-]{8,128}$/.test(trade.transaction_id))
      return reply(400);
    await recordVerifiedNativeNotification({
      orderId:trade.out_trade_no,
      eventId:envelope.id,
      transactionId:trade.transaction_id,
      amountMinor:expected.amountMinor,
      currency:"CNY",
      payloadSha256:proof.payloadSha256,
      signatureVerified:true,
      signedTradeMatched:true,
    });
    return reply(204);
  } catch {
    // Non-2xx lets WeChat retry safely; details stay out of public logs.
    return reply(503);
  }
}

/* Deliberate: no GET webhook and no merchant values emitted publicly. */
