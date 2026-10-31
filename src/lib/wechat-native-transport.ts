import { randomBytes, type KeyObject } from "node:crypto";
import {
  prepareWechatNativeQuery, prepareWechatNativeRequest, prepareWechatNativeClose,
  verifyWechatV3Notification, validateOfficialWechatPaidTrade,
  WechatPaymentProtocolError,
  type NativeMerchantConfig, type NativeOrderSnapshot,
  type PreparedNativeRequest, type PreparedNativeQuery,
} from "./wechat-native-payment";

/**
 * Server-only transport boundary for the historic ThinkAI Native flow.
 * This file does not expose HTTP routes, turn on checkout, settle a ledger,
 * log secrets, render QR codes, or run without explicit caller credentials.
 * Production callers must read keys from a protected server secret provider.
 */
type SignedRequest = PreparedNativeRequest | PreparedNativeQuery;
export type WechatNativeTransport = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export type WechatNativeApiContext = Readonly<{
  merchant: NativeMerchantConfig;
  wechatPayPublicKey: KeyObject;
  wechatPayPublicKeyId: string;
  /** Explicit per-operation official server time; never trust user clocks. */
  nowSeconds: number;
  nonce?: string;
  /** Injection for isolated tests; default Node server fetch. */
  transport?: WechatNativeTransport;
}>;

function randomNonce() { return randomBytes(16).toString("hex"); }
function safeObject(json: string): Record<string, unknown> {
  try {
    const obj: unknown = JSON.parse(json);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj as Record<string, unknown>;
  } catch { /* no raw error or downstream body in logs */ }
  throw new WechatPaymentProtocolError("INVALID_PROVIDER_BODY");
}

async function signedProviderExchange(
  request: SignedRequest,
  context: WechatNativeApiContext,
): Promise<{ data: Record<string, unknown>; verifiedBodySha256: string }> {
  // The signed body is sent verbatim. Never use fetch's json/JSON.stringify
  // again after signing; a changed byte invalidates API v3 Authorization.
  const body = request.method === "POST" ? request.bodyText : undefined;
  // WeChat Pay official public-key mode requires this REQUEST header to
  // select the corresponding public-key signature on the API RESPONSE.
  // It is NOT the merchant API certificate serial in Authorization.
  // Never silently fall back to unverified platform-certificate responses.
  if (!/^PUB_KEY_ID_[0-9]{1,64}$/.test(context.wechatPayPublicKeyId))
    throw new WechatPaymentProtocolError("INVALID_WECHAT_PUBLIC_KEY_ID");
  const requestHeaders = {
    ...request.headers,
    "Wechatpay-Serial": context.wechatPayPublicKeyId,
  };
  let response: Response;
  try {
    response = await (context.transport ?? fetch)(request.url, {
      method: request.method,
      headers: requestHeaders,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  } catch {
    throw new WechatPaymentProtocolError("WECHAT_NETWORK_FAILURE");
  }
  // Do not forward raw provider error bodies or signature headers to the user.
  if (!response.ok) throw new WechatPaymentProtocolError("WECHAT_DOWNSTREAM_STATUS");
  const rawBody = await response.text();
  if (rawBody.length > 65536) throw new WechatPaymentProtocolError("WECHAT_BODY_TOO_LARGE");
  const headers = Object.fromEntries(response.headers.entries());
  const verified = verifyWechatV3Notification({
    headers,
    rawBody,
    wechatPayPublicKey: context.wechatPayPublicKey,
    expectedWechatPaySerial: context.wechatPayPublicKeyId,
    nowSeconds: context.nowSeconds,
  });
  if (!verified.ok) throw new WechatPaymentProtocolError("WECHAT_RESPONSE_" + verified.code);
  return { data: safeObject(rawBody), verifiedBodySha256: verified.payloadSha256! };
}

/**
 * The returned codeUrl is a one-time payment instruction, not a QR PNG.
 * Render it locally/in owned web origin; NEVER send it to qrserver.com or
 * another third-party QR converter.
 */
export async function createVerifiedWechatNativeCheckout(
  context: WechatNativeApiContext,
  order: NativeOrderSnapshot,
): Promise<{ orderId: string; codeUrl: string }> {
  const req = prepareWechatNativeRequest(
    context.merchant,order,context.nowSeconds,context.nonce ?? randomNonce(),
  );
  const {data: result} = await signedProviderExchange(req,context);
  const codeUrl = result.code_url;
  // Official 2026 Native API example:
  // weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&groupid=00
  // Both the /up segment and an optional groupid must be accepted.
  if (typeof codeUrl !== "string" || codeUrl.length > 1024)
    throw new WechatPaymentProtocolError("INVALID_NATIVE_CODE_URL");
  let parsed:URL;
  try { parsed = new URL(codeUrl); }
  catch { throw new WechatPaymentProtocolError("INVALID_NATIVE_CODE_URL"); }
  const parts = [...parsed.searchParams.entries()];
  if (parsed.protocol !== "weixin:" || parsed.hostname !== "wxpay" ||
      !["/bizpayurl/up", "/bizpayurl"].includes(parsed.pathname) ||
      parsed.username || parsed.password || parsed.hash ||
      parsed.searchParams.getAll("pr").length !== 1 ||
      !/^[A-Za-z0-9_-]{4,512}$/.test(parsed.searchParams.get("pr") ?? "") ||
      parts.some(([key,value]) =>
        !["pr","groupid"].includes(key) ||
        !/^[A-Za-z0-9_-]{1,512}$/.test(value)) ||
      parsed.searchParams.getAll("groupid").length > 1)
    throw new WechatPaymentProtocolError("INVALID_NATIVE_CODE_URL");
  return { orderId:order.orderId, codeUrl };
}

/** Only acknowledge a provider-verified HTTP 204 and signed empty response.
 * Caller MUST query official CLOSED state before touching the local ledger.
 */
export async function closeVerifiedWechatNativePayment(
  context:WechatNativeApiContext,orderId:string,
):Promise<void>{
  const req=prepareWechatNativeClose(context.merchant,orderId,context.nowSeconds,
    context.nonce??randomNonce());
  let response:Response;
  try{
    response=await (context.transport??fetch)(req.url,{
      method:req.method,headers:req.headers,body:req.bodyText,
      redirect:"error",signal:AbortSignal.timeout(10000),cache:"no-store",
    });
  }catch{throw new WechatPaymentProtocolError("WECHAT_CLOSE_NETWORK_FAILURE");}
  if(response.status!==204)throw new WechatPaymentProtocolError("WECHAT_CLOSE_NOT_ACKED");
  const body=await response.text();
  if(body!=="")throw new WechatPaymentProtocolError("WECHAT_CLOSE_UNEXPECTED_BODY");
  const proof=verifyWechatV3Notification({
    headers:Object.fromEntries(response.headers.entries()),rawBody:body,
    wechatPayPublicKey:context.wechatPayPublicKey,
    expectedWechatPaySerial:context.wechatPayPublicKeyId,
    nowSeconds:context.nowSeconds,
  });
  if(!proof.ok)throw new WechatPaymentProtocolError("WECHAT_CLOSE_"+proof.code);
}

export async function queryVerifiedWechatNativePayment(
  context: WechatNativeApiContext,
  expected: NativeOrderSnapshot,
): Promise<{ status:"NOT_PAID" | "VERIFIED_PAID" | "VERIFIED_CLOSED"; transactionId?: string; verifiedBodySha256?: string }> {
  const req = prepareWechatNativeQuery(
    context.merchant,expected.orderId,context.nowSeconds,context.nonce ?? randomNonce(),
  );
  const {data:result,verifiedBodySha256} = await signedProviderExchange(req,context);
  // This independently checks the server-signed official query response
  // against immutable local order. A response cannot be used for another order.
  if (result.trade_state !== "SUCCESS") {
    if (result.out_trade_no !== expected.orderId ||
        result.mchid !== context.merchant.merchantId ||
        result.appid !== context.merchant.appId)
      throw new WechatPaymentProtocolError("QUERY_ORDER_MISMATCH");
    if(result.trade_state==="CLOSED")
      return {status:"VERIFIED_CLOSED",verifiedBodySha256};
    if(result.trade_state==="NOTPAY"||result.trade_state==="USERPAYING")
      return {status:"NOT_PAID"};
    throw new WechatPaymentProtocolError("UNEXPECTED_OFFICIAL_TRADE_STATE");
  }
  const checked = validateOfficialWechatPaidTrade({
    trade: result,
    expected:{
      merchantId:context.merchant.merchantId,
      appId:context.merchant.appId,
      orderId:expected.orderId,
      amountMinor:expected.amountMinor,
    },
  });
  if (!checked.ok) throw new WechatPaymentProtocolError(checked.code);
  return {status:"VERIFIED_PAID",transactionId:result.transaction_id as string,verifiedBodySha256};
}
