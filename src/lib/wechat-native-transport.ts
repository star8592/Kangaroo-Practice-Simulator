import { randomBytes, type KeyObject } from "node:crypto";
import {
  prepareWechatNativeQuery, prepareWechatNativeRequest,
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
): Promise<Record<string, unknown>> {
  // The signed body is sent verbatim. Never use fetch's json/JSON.stringify
  // again after signing; a changed byte invalidates API v3 Authorization.
  const body = request.method === "POST" ? request.bodyText : undefined;
  let response: Response;
  try {
    response = await (context.transport ?? fetch)(request.url, {
      method: request.method,
      headers: request.headers,
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
  return safeObject(rawBody);
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
  const result = await signedProviderExchange(req,context);
  const codeUrl = result.code_url;
  if (typeof codeUrl !== "string" ||
      !/^weixin:\/\/wxpay\/bizpayurl\?pr=[A-Za-z0-9_-]{8,512}$/.test(codeUrl))
    throw new WechatPaymentProtocolError("INVALID_NATIVE_CODE_URL");
  return { orderId:order.orderId, codeUrl };
}

export async function queryVerifiedWechatNativePayment(
  context: WechatNativeApiContext,
  expected: NativeOrderSnapshot,
): Promise<{ status:"NOT_PAID" | "VERIFIED_PAID"; transactionId?: string }> {
  const req = prepareWechatNativeQuery(
    context.merchant,expected.orderId,context.nowSeconds,context.nonce ?? randomNonce(),
  );
  const result = await signedProviderExchange(req,context);
  // This independently checks the server-signed official query response
  // against immutable local order. A response cannot be used for another order.
  if (result.trade_state !== "SUCCESS") {
    if (result.out_trade_no !== expected.orderId ||
        result.mchid !== context.merchant.merchantId ||
        result.appid !== context.merchant.appId)
      throw new WechatPaymentProtocolError("QUERY_ORDER_MISMATCH");
    return {status:"NOT_PAID"};
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
  return {status:"VERIFIED_PAID",transactionId:result.transaction_id as string};
}
