import "server-only";
import { nativeCheckoutAllowed, nativeSettlementAllowed } from "./wechat-native-flags";
export { nativeCheckoutAllowed, nativeSettlementAllowed } from "./wechat-native-flags";
import {
  createPrivateKey, createPublicKey,
  type KeyObject,
} from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import type { NativeMerchantConfig } from "./wechat-native-payment";
import type { WechatNativeApiContext } from "./wechat-native-transport";

export class NativeCheckoutUnavailable extends Error {
  constructor() { super("WEB_NATIVE_PAYMENT_UNAVAILABLE"); }
}

function required(env:NodeJS.ProcessEnv,key:string):string {
  const v=env[key]?.trim();
  if (!v) throw new NativeCheckoutUnavailable();
  return v;
}
function safePem(path:string):Buffer {
  if (!path.startsWith("/")) throw new NativeCheckoutUnavailable();
  try {
    const stat=statSync(path);
    if (!stat.isFile() || (stat.mode & 0o077)!==0 ||
      stat.size<100 || stat.size>16384)
      throw new NativeCheckoutUnavailable();
    return readFileSync(path);
  } catch { throw new NativeCheckoutUnavailable(); }
}
function pemKey(path:string,publicOnly:boolean):KeyObject {
  const raw=safePem(path);
  try { return publicOnly?createPublicKey(raw):createPrivateKey(raw); }
  catch { throw new NativeCheckoutUnavailable(); }
}
/** No secrets ever sent to the browser/logs; no fallback to a sibling product. */
export function nativeServerContext(
  env:NodeJS.ProcessEnv=process.env,
  nowSeconds=Math.floor(Date.now()/1000),
  purpose:"checkout"|"reconciliation"="checkout",
):WechatNativeApiContext {
  if (!(purpose==="checkout"?nativeCheckoutAllowed(env):nativeSettlementAllowed(env)))
    throw new NativeCheckoutUnavailable();
  const appId=required(env,"WECHAT_PAY_APPID");
  const merchantId=required(env,"WECHAT_PAY_MCHID");
  const merchantCertificateSerial=required(env,"WECHAT_PAY_SERIAL_NO");
  const notifyUrl=required(env,"WECHAT_PAY_NOTIFY_URL");
  const declaredOrigin=required(env,"SOCTHINK_PUBLIC_ORIGIN");
  let parsed:URL;
  try { parsed=new URL(notifyUrl); }
  catch { throw new NativeCheckoutUnavailable(); }
  if (!/^https:\/\//.test(declaredOrigin) || parsed.origin!==declaredOrigin ||
    parsed.pathname!=="/api/payments/wechat/notify" ||
    parsed.search || parsed.hash || parsed.username || parsed.password)
    throw new NativeCheckoutUnavailable();
  const merchant:NativeMerchantConfig={
    appId,merchantId,merchantCertificateSerial,
    notifyUrl,allowedNotifyOrigins:[declaredOrigin],
    merchantPrivateKey:pemKey(required(env,"WECHAT_PAY_PRIVATE_KEY_PATH"),false),
  };
  const wechatPayPublicKey=pemKey(required(env,"WECHAT_PAY_PUBLIC_KEY_PATH"),true);
  const wechatPayPublicKeyId=required(env,"WECHAT_PAY_PUBLIC_KEY_ID");
  if (!/^PUB_KEY_ID_[0-9]+$/.test(wechatPayPublicKeyId) ||
    Buffer.byteLength(required(env,"WECHAT_PAY_API_V3_KEY"),"utf8")!==32)
    throw new NativeCheckoutUnavailable();
  return {merchant,wechatPayPublicKey,wechatPayPublicKeyId,nowSeconds};
}
export function nativeApiV3Key(env:NodeJS.ProcessEnv=process.env):Buffer {
  if (!nativeSettlementAllowed(env)) throw new NativeCheckoutUnavailable();
  const key=Buffer.from(required(env,"WECHAT_PAY_API_V3_KEY"),"utf8");
  if (key.length!==32) throw new NativeCheckoutUnavailable();
  return key;
}
