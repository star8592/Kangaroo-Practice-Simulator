#!/usr/bin/env node
// Read-only environment inspection. This NEVER charges or activates payments.
import { readFileSync, statSync } from 'node:fs';
import { X509Certificate, createPrivateKey, createPublicKey } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';

export function inspectWeChatPay(env, io = { readFileSync, statSync }) {
  const issues = [], checks = [];
  const err = (code, message) => issues.push({code,message});
  const has = name => Boolean(env[name]?.trim());
  const mini = env.WECHAT_MINIAPP_APPID?.trim(), pay = env.WECHAT_PAY_APPID?.trim();
  if (!mini || !pay) err('APPID_MISSING', 'Miniapp and payment AppIDs are required.');
  else if (mini !== pay) err('APPID_MISMATCH', 'Payment AppID differs from this mini-program AppID.');
  if (env.PAYMENT_PROVIDER === 'wechat_native') err('NATIVE_NOT_MINIAPP', 'Native QR payment cannot be used for in-miniapp checkout.');
  if (!has('WECHAT_PAY_MCHID')) err('MCHID_MISSING', 'Merchant ID missing.');
  if (Buffer.byteLength(env.WECHAT_PAY_API_V3_KEY || '', 'utf8') !== 32) err('API_V3_KEY_INVALID', 'API v3 key length must be 32 bytes.');
  const certSerial = env.WECHAT_PAY_SERIAL_NO?.trim().toUpperCase();
  if (!certSerial || !/^[A-F0-9]+$/.test(certSerial)) err('SERIAL_MISSING', 'Merchant certificate serial is invalid.');
  let key;
  try {
    const path = env.WECHAT_PAY_PRIVATE_KEY_PATH;
    if (!path?.startsWith('/')) throw Error('invalid path');
    const s = io.statSync(path);
    if (!s.isFile() || (s.mode & 0o077) !== 0) err('PRIVATE_KEY_PERMISSIONS', 'Key must be a private, regular file.');
    key = createPrivateKey(io.readFileSync(path));
    checks.push('PRIVATE_KEY_PARSED');
  } catch {err('PRIVATE_KEY_UNREADABLE','Merchant private key missing or unreadable on this host.');}
  try {
    if (!env.WECHAT_PAY_PUBLIC_KEY_PATH?.startsWith('/')) throw Error('invalid path');
    createPublicKey(io.readFileSync(env.WECHAT_PAY_PUBLIC_KEY_PATH));
    checks.push('PUBLIC_KEY_PARSED');
  } catch {err('PUBLIC_KEY_UNREADABLE','WeChat Pay public key missing or unreadable on this host.');}
  if (!/^PUB_KEY_ID_[0-9]+$/.test(env.WECHAT_PAY_PUBLIC_KEY_ID || '')) err('PUBLIC_KEY_ID_MISSING', 'Valid platform public key ID missing.');
  if (key) {
    try {
      const cert = new X509Certificate(io.readFileSync(join(dirname(env.WECHAT_PAY_PRIVATE_KEY_PATH),'apiclient_cert.pem')));
      if (cert.serialNumber.toUpperCase() !== certSerial) err('CERT_SERIAL_MISMATCH','Certificate serial and configured serial differ.');
      const cp = cert.publicKey.export({format:'der',type:'spki'});
      const kp = createPublicKey(key).export({format:'der',type:'spki'});
      if (!cp.equals(kp)) err('CERT_KEY_MISMATCH','Merchant certificate and private key do not match.');
      checks.push('CERT_PARSED');
    } catch {err('CERT_UNREADABLE','Merchant apiclient_cert.pem is missing or invalid.');}
  }
  try {
    const url = new URL(env.WECHAT_PAY_NOTIFY_URL);
    if (url.protocol !== 'https:' || url.hostname !== 'socthink.cn' || url.pathname !== '/api/payments/wechat/notify')
      err('WRONG_CALLBACK','Use a separate callback for this project: https://socthink.cn/api/payments/wechat/notify');
  } catch {err('WRONG_CALLBACK','Independent HTTPS payment callback missing.');}
  if (!has('SOCTHINK_BILLING_DATABASE_URL')) err('NO_BILLING_DB','Production billing ledger is not configured.');
  if (env.PAYMENT_PROVIDER === 'wechat_virtual' && (!has('WECHAT_VIRTUAL_OFFER_ID') || !has('WECHAT_VIRTUAL_APPKEY')))
    err('NO_VIRTUAL_CONFIG','Virtual payment offer ID and AppKey required.');
  return {ok:issues.length===0,checks,issues,
    needsOfficialVerification:['merchant AppID binding','virtual goods/payment product eligibility','callback E2E','refund and reconciliation'],
    note:'Preflight only. Charging is NOT enabled.'};
}
if (process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)) {
  const result=inspectWeChatPay(process.env);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.ok)process.exitCode=2;
}
