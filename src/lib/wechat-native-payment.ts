import {
  createDecipheriv, createHash, sign, verify,
  type KeyObject,
} from "node:crypto";

/**
 * Payment v3 protocol primitives ported from the proven legacy ThinkAI Native
 * integration. These functions NEVER initiate a payment, open a checkout route,
 * settle an order, or read a production secret. Merchant keys must be supplied
 * from a protected server-only secret provider.
 *
 * Not for WeChat mini-program virtual payments: a different product contract.
 */

export type NativeMerchantConfig = Readonly<{
  appId: string;
  merchantId: string;
  merchantCertificateSerial: string;
  merchantPrivateKey: KeyObject;
  notifyUrl: string;
  allowedNotifyOrigins: readonly string[];
}>;

export type NativeOrderSnapshot = Readonly<{
  /** Server-created order id with no client-supplied payment state. */
  orderId: string;
  description: string;
  amountMinor: number;
  currency: "CNY";
}>;

export type PreparedNativeRequest = Readonly<{
  method: "POST";
  url: "https://api.mch.weixin.qq.com/v3/pay/transactions/native";
  headers: Readonly<Record<string, string>>;
  bodyText: string;
  orderId: string;
}>;

export class WechatPaymentProtocolError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "WechatPaymentProtocolError";
  }
}

function requireProtocol(ok: boolean, code: string): asserts ok {
  if (!ok) throw new WechatPaymentProtocolError(code);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function validTradeNo(id: string): boolean {
  return /^[a-zA-Z0-9_*-]{6,32}$/.test(id);
}

function validNotify(config: NativeMerchantConfig): boolean {
  try {
    const u = new URL(config.notifyUrl);
    return u.protocol === "https:" &&
      !u.username && !u.password && !u.search && !u.hash &&
      config.allowedNotifyOrigins.includes(u.origin) &&
      u.pathname.startsWith("/api/") &&
      u.pathname.length > 8;
  } catch {
    return false;
  }
}

export function signWechatV3Request(
  method: "POST" | "GET",
  canonicalPathAndQuery: string,
  timestamp: number,
  nonce: string,
  exactBodyText: string,
  merchantKey: KeyObject,
): string {
  requireProtocol(Number.isSafeInteger(timestamp) && timestamp > 0, "INVALID_TIMESTAMP");
  requireProtocol(/^[a-zA-Z0-9]{16,64}$/.test(nonce), "INVALID_NONCE");
  requireProtocol(canonicalPathAndQuery.startsWith("/") && !canonicalPathAndQuery.includes("\n"), "INVALID_PATH");
  requireProtocol(merchantKey.type === "private" && merchantKey.asymmetricKeyType === "rsa", "INVALID_SIGNING_KEY");
  const msg = `${method}\n${canonicalPathAndQuery}\n${timestamp}\n${nonce}\n${exactBodyText}\n`;
  return sign("RSA-SHA256", Buffer.from(msg, "utf8"), merchantKey).toString("base64");
}

/** The caller must send EXACTLY the returned bodyText, never re-serialize it. */
export function prepareWechatNativeRequest(
  config: NativeMerchantConfig,
  order: NativeOrderSnapshot,
  timestamp: number,
  nonce: string,
): PreparedNativeRequest {
  requireProtocol(validTradeNo(order.orderId), "INVALID_ORDER_ID");
  requireProtocol(/^wx[a-zA-Z0-9]{16}$/.test(config.appId), "INVALID_APPID");
  requireProtocol(/^[0-9]{8,15}$/.test(config.merchantId), "INVALID_MERCHANT");
  requireProtocol(/^[0-9A-Fa-f]{8,64}$/.test(config.merchantCertificateSerial), "INVALID_CERT_SERIAL");
  requireProtocol(validNotify(config), "INVALID_NOTIFY_URL");
  requireProtocol(order.currency === "CNY", "UNSUPPORTED_CURRENCY");
  requireProtocol(Number.isSafeInteger(order.amountMinor) && order.amountMinor > 0, "INVALID_AMOUNT");
  requireProtocol(order.description.trim().length > 0 && order.description.length <= 127, "INVALID_DESCRIPTION");
  const payload = {
    appid: config.appId,
    mchid: config.merchantId,
    description: order.description,
    out_trade_no: order.orderId,
    notify_url: config.notifyUrl,
    amount: { total: order.amountMinor, currency: order.currency },
  };
  const bodyText = JSON.stringify(payload);
  const path = "/v3/pay/transactions/native";
  const signature = signWechatV3Request("POST", path, timestamp, nonce, bodyText, config.merchantPrivateKey);
  const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${config.merchantId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.merchantCertificateSerial}"`;
  return {
    method: "POST",
    url: "https://api.mch.weixin.qq.com/v3/pay/transactions/native",
    headers: { "Authorization": auth, "Accept": "application/json", "Content-Type": "application/json" },
    bodyText, orderId: order.orderId,
  };
}

export type PreparedNativeQuery = Readonly<{
  method: "GET";
  url: string;
  headers: Readonly<Record<string, string>>;
  orderId: string;
}>;

/** Query an existing server-created order; it does not create a payment. */
export function prepareWechatNativeQuery(
  config: NativeMerchantConfig,
  orderId: string,
  timestamp: number,
  nonce: string,
): PreparedNativeQuery {
  requireProtocol(validTradeNo(orderId), "INVALID_ORDER_ID");
  requireProtocol(/^wx[a-zA-Z0-9]{16}$/.test(config.appId), "INVALID_APPID");
  requireProtocol(/^[0-9A-Fa-f]{8,64}$/.test(config.merchantCertificateSerial), "INVALID_CERT_SERIAL");
  requireProtocol(/^[0-9]{8,15}$/.test(config.merchantId), "INVALID_MERCHANT");
  const path = `/v3/pay/transactions/out-trade-no/${orderId}?mchid=${config.merchantId}`;
  const signature = signWechatV3Request("GET", path, timestamp, nonce, "", config.merchantPrivateKey);
  const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${config.merchantId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.merchantCertificateSerial}"`;
  return {
    method:"GET",url:`https://api.mch.weixin.qq.com${path}`,
    headers: { "Authorization": auth, "Accept": "application/json" },
    orderId,
  };
}

type HeaderBag = Readonly<Record<string, string | undefined>>;
function header(headers: HeaderBag, key: string): string {
  const match = Object.entries(headers).find(([k]) => k.toLowerCase() === key.toLowerCase());
  return stringValue(match?.[1]);
}

/** An isolated pure verifier: authenticated raw body, no entitlement side effect. */
export function verifyWechatV3Notification(input: Readonly<{
  headers: HeaderBag;
  rawBody: string;
  /** The configured corresponding WeChat Pay public key, never merchant key. */
  wechatPayPublicKey: KeyObject;
  expectedWechatPaySerial: string;
  nowSeconds: number;
  maxClockSkewSeconds?: number;
}>): { ok: boolean; code: string; payloadSha256?: string } {
  const serial = header(input.headers, "Wechatpay-Serial");
  const signature = header(input.headers, "Wechatpay-Signature");
  const tsText = header(input.headers, "Wechatpay-Timestamp");
  const nonce = header(input.headers, "Wechatpay-Nonce");
  const type = header(input.headers, "Wechatpay-Signature-Type");
  if (type && type !== "WECHATPAY2-SHA256-RSA2048") return { ok: false, code: "UNSUPPORTED_SIGN_TYPE" };
  if (!serial || serial !== input.expectedWechatPaySerial) return { ok: false, code: "UNTRUSTED_SERIAL" };
  if (!/^[0-9]{1,14}$/.test(tsText)) return { ok: false, code: "INVALID_TIMESTAMP" };
  const timestamp = Number(tsText);
  const skew = input.maxClockSkewSeconds ?? 300;
  if (!Number.isSafeInteger(input.nowSeconds) || !Number.isSafeInteger(timestamp) ||
    !Number.isSafeInteger(skew) || skew < 0 ||
    Math.abs(input.nowSeconds - timestamp) > skew) return { ok: false, code: "STALE_TIMESTAMP" };
  if (!/^[a-zA-Z0-9]{8,128}$/.test(nonce)) return { ok: false, code: "INVALID_NONCE" };
  if (signature.startsWith("WECHATPAY/SIGNTEST/")) return { ok: false, code: "SIGNATURE_PROBE" };
  if (!/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(signature) ||
    signature.length < 40) return { ok: false, code: "INVALID_SIGNATURE" };
  if (input.wechatPayPublicKey.type !== "public" ||
    input.wechatPayPublicKey.asymmetricKeyType !== "rsa") return { ok: false, code: "WRONG_PLATFORM_KEY" };
  const msg = `${tsText}\n${nonce}\n${input.rawBody}\n`;
  let ok = false;
  try {
    ok = verify("RSA-SHA256", Buffer.from(msg, "utf8"), input.wechatPayPublicKey,
      Buffer.from(signature, "base64"));
  } catch { return { ok: false, code: "INVALID_SIGNATURE" }; }
  return ok
    ? { ok: true, code: "SIGNATURE_VERIFIED", payloadSha256: createHash("sha256").update(input.rawBody).digest("hex") }
    : { ok: false, code: "INVALID_SIGNATURE" };
}

export type EncryptedWechatResource = Readonly<{
  algorithm: string;
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}>;

/** Must be called only AFTER signature verification on the exact raw body. */
export function decryptWechatV3Resource(
  resource: EncryptedWechatResource,
  apiV3Key: Buffer,
): Record<string, unknown> {
  requireProtocol(apiV3Key.length === 32, "INVALID_API_V3_KEY");
  requireProtocol(resource.algorithm === "AEAD_AES_256_GCM", "UNSUPPORTED_ENCRYPTION");
  requireProtocol(typeof resource.nonce === "string" && Buffer.byteLength(resource.nonce, "utf8") === 12, "INVALID_GCM_NONCE");
  requireProtocol(typeof resource.ciphertext === "string" && resource.ciphertext.length > 24, "INVALID_CIPHERTEXT");
  const raw = Buffer.from(resource.ciphertext, "base64");
  requireProtocol(raw.length > 16, "INVALID_CIPHERTEXT");
  const ciphertext = raw.subarray(0, -16);
  const tag = raw.subarray(-16);
  try {
    const cipher = createDecipheriv("aes-256-gcm", apiV3Key, Buffer.from(resource.nonce, "utf8"));
    cipher.setAAD(Buffer.from(resource.associated_data ?? "", "utf8"));
    cipher.setAuthTag(tag);
    const decrypted = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
    const parsed: unknown = JSON.parse(decrypted.toString("utf8"));
    requireProtocol(parsed !== null && typeof parsed === "object" && !Array.isArray(parsed), "INVALID_PAYLOAD");
    return parsed as Record<string, unknown>;
  } catch {
    throw new WechatPaymentProtocolError("GCM_AUTH_OR_PAYLOAD_FAILED");
  }
}

/** Validate a separately signed official WeChat query against an immutable
 * local order. Signature verification must precede calling this helper. */
export function validateOfficialWechatPaidTrade(input: Readonly<{
  trade: Record<string, unknown>;
  expected: {merchantId: string; appId: string; orderId: string; amountMinor: number};
}>): {ok:boolean; code:string} {
  const r = input.trade, expected = input.expected;
  const amount = r.amount;
  const a = amount && typeof amount === "object" && !Array.isArray(amount)
    ? amount as Record<string, unknown> : {};
  if (r.trade_state !== "SUCCESS" || r.trade_type !== "NATIVE" ||
    r.mchid !== expected.merchantId || r.appid !== expected.appId ||
    r.out_trade_no !== expected.orderId ||
    a.total !== expected.amountMinor || a.currency !== "CNY" ||
    typeof r.transaction_id !== "string" || r.transaction_id.length === 0)
    return {ok:false,code:"PAYMENT_MISMATCH"};
  return {ok:true,code:"VERIFIED_QUERY_MATCH"};
}

/** Compare authenticated notification with independently verified official query.
 * IMPORTANT: This function alone does NOT authenticate the query response.
 * The caller must verify WeChat Pay's response signature before invoking it,
 * and only the billing ledger may grant entitlements in one transaction.
 */
export function matchWechatPaidTrade(input: Readonly<{
  callbackTrade: Record<string, unknown>;
  officialQueriedTrade: Record<string, unknown>;
  expected: { merchantId: string; appId: string; orderId: string; amountMinor: number };
}>): { ok: boolean; code: string } {
  const a = input.callbackTrade, b = input.officialQueriedTrade;
  if (!validateOfficialWechatPaidTrade({trade:a,expected:input.expected}).ok ||
      !validateOfficialWechatPaidTrade({trade:b,expected:input.expected}).ok)
    return {ok:false,code:"PAYMENT_MISMATCH"};
  if (a.transaction_id !== b.transaction_id)
    return {ok:false,code:"TRANSACTION_MISMATCH"};
  return {ok:true,code:"OFFICIAL_QUERY_MATCH"};
}
