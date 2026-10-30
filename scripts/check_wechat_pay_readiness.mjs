#!/usr/bin/env node
// Read-only context-sensitive preflight. NEVER charges, verifies approval,
// activates payment or prints secrets. Run within the intended service host.
import { readFileSync, statSync } from 'node:fs';
import { X509Certificate, createPrivateKey, createPublicKey } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';

/**
 * Scope is explicit: a Web Native payment APPID is not necessarily the
 * mini-program APPID. Never use a miniapp mismatch to block valid Web Native.
 * For miniapp digital goods, review the virtual-payment product separately.
 */
export function inspectWeChatPay(env, io = { readFileSync, statSync }) {
  const issues = [], checks = [];
  const err = (code, message) => issues.push({code,message});
  const has = name => Boolean(env[name]?.trim());
  const provider = env.PAYMENT_PROVIDER?.trim();
  const surface = env.SOCTHINK_PAYMENT_SURFACE?.trim() || 'miniapp-virtual';
  if (!['web-native', 'miniapp-virtual'].includes(surface)) {
    err('INVALID_SURFACE', 'Explicitly select web-native or miniapp-virtual.');
    return {ok:false,checks,issues,needsOfficialVerification:[],note:'Preflight only. Charging is NOT enabled.'};
  }
  if (!has('SOCTHINK_BILLING_DATABASE_URL')) err('NO_BILLING_DB','Production billing ledger is not configured.');

  if (surface === 'miniapp-virtual') {
    const mini = env.WECHAT_MINIAPP_APPID?.trim();
    if (!mini) err('APPID_MISSING','Mini-program APPID missing.');
    // Reject attempting to use a normal Native checkout inside a mini-program.
    if (provider === 'wechat_native') {
      err('NATIVE_NOT_MINIAPP','Web Native QR payment cannot be used for miniapp virtual goods.');
      if (mini && env.WECHAT_PAY_APPID?.trim() && mini !== env.WECHAT_PAY_APPID.trim())
        err('APPID_MISMATCH','Native payment APPID belongs to a different application.');
      // Preserve legacy diagnostics only for the forbidden Native-in-miniapp
      // configuration. Real virtual payments do NOT reuse this callback route.
      try {
        const callback = new URL(env.WECHAT_PAY_NOTIFY_URL);
        if (callback.protocol !== 'https:' || callback.hostname !== 'socthink.cn' ||
            callback.pathname !== '/api/payments/wechat/notify')
          err('WRONG_CALLBACK','Legacy Native callback is not owned by this project.');
      } catch {
        err('WRONG_CALLBACK','Legacy Native callback is invalid.');
      }
    } else if (provider !== 'wechat_virtual') {
      err('INVALID_PROVIDER','Only separately approved virtual payment is admissible for this miniapp product.');
    }
    // Mini-program virtual products use their actual platform virtual-payment
    // grant and own app credentials, NOT a pretend copy of Web Native PEM keys.
    if (!has('WECHAT_VIRTUAL_OFFER_ID') || !has('WECHAT_VIRTUAL_APPKEY'))
      err('NO_VIRTUAL_CONFIG','Mini-program virtual payment product parameters missing.');
    return {ok:issues.length===0,checks,issues,
      needsOfficialVerification:['miniapp digital-goods category and virtual product authorization','virtual order verification, delivery and refunds','entitlement reconciliation'],
      note:'Miniapp virtual-payment configuration inventory only. Does NOT establish platform approval or allow charging.'};
  }

  if (provider !== 'wechat_native') err('INVALID_PROVIDER','Web Native scope requires the Web Native merchant product.');
  if (!has('WECHAT_PAY_APPID')) err('APPID_MISSING','Web payment application APPID missing.');
  if (!has('WECHAT_PAY_MCHID')) err('MCHID_MISSING', 'Merchant ID missing.');
  if (Buffer.byteLength(env.WECHAT_PAY_API_V3_KEY || '', 'utf8') !== 32)
    err('API_V3_KEY_INVALID','API v3 key must be 32 bytes.');
  const certSerial = env.WECHAT_PAY_SERIAL_NO?.trim().toUpperCase();
  if (!certSerial || !/^[A-F0-9]+$/.test(certSerial)) err('SERIAL_MISSING','Merchant certificate serial is invalid.');
  let key;
  try {
    const path = env.WECHAT_PAY_PRIVATE_KEY_PATH;
    if (!path?.startsWith('/')) throw Error('invalid path');
    const s = io.statSync(path);
    if (!s.isFile() || (s.mode & 0o077) !== 0) err('PRIVATE_KEY_PERMISSIONS','Key must be a private regular file.');
    key = createPrivateKey(io.readFileSync(path));
    checks.push('PRIVATE_KEY_PARSED');
  } catch {err('PRIVATE_KEY_UNREADABLE','Merchant private key missing or unreadable on this host.');}
  try {
    if (!env.WECHAT_PAY_PUBLIC_KEY_PATH?.startsWith('/')) throw Error('invalid path');
    createPublicKey(io.readFileSync(env.WECHAT_PAY_PUBLIC_KEY_PATH));
    checks.push('PUBLIC_KEY_PARSED');
  } catch {err('PUBLIC_KEY_UNREADABLE','WeChat Pay public key missing or unreadable on this host.');}
  if (!/^PUB_KEY_ID_[0-9]+$/.test(env.WECHAT_PAY_PUBLIC_KEY_ID || ''))
    err('PUBLIC_KEY_ID_MISSING','WeChat Pay public key ID missing.');
  if (key) {
    try {
      const cert = new X509Certificate(io.readFileSync(join(dirname(env.WECHAT_PAY_PRIVATE_KEY_PATH),'apiclient_cert.pem')));
      if (cert.serialNumber.toUpperCase() !== certSerial) err('CERT_SERIAL_MISMATCH','Certificate serial and configured serial differ.');
      const cp = cert.publicKey.export({format:'der',type:'spki'});
      const kp = createPublicKey(key).export({format:'der',type:'spki'});
      if (!cp.equals(kp)) err('CERT_KEY_MISMATCH','Merchant certificate and private key do not match.');
      checks.push('CERT_PARSED');
    } catch {err('CERT_UNREADABLE','Merchant apiclient_cert.pem missing or invalid.');}
  }
  try {
    const url = new URL(env.WECHAT_PAY_NOTIFY_URL);
    if (url.protocol !== 'https:' || url.hostname !== 'socthink.cn' || url.pathname !== '/api/payments/wechat/notify')
      err('WRONG_CALLBACK','Use an independent HTTPS callback owned by this project.');
  } catch {err('WRONG_CALLBACK','Independent HTTPS payment callback missing.');}
  return {ok:issues.length===0,checks,issues,
    needsOfficialVerification:['web app and merchant binding','Native merchant product authorization','callback E2E and query','refund and reconciliation'],
    note:'Web Native preflight only. Does NOT establish real merchant approval, callback deployment or charge readiness.'};
}
if (process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)) {
  const result=inspectWeChatPay(process.env);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.ok)process.exitCode=2;
}
