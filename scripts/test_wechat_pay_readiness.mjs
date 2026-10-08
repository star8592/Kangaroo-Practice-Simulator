import assert from 'node:assert/strict';
import { inspectWeChatPay } from './check_wechat_pay_readiness.mjs';
const conf = {
 WECHAT_MINIAPP_APPID:'wx_mini',WECHAT_PAY_APPID:'wx_other',
 PAYMENT_PROVIDER:'wechat_native',WECHAT_PAY_MCHID:'merchant_secret_id',
 WECHAT_PAY_API_V3_KEY:'0'.repeat(32),WECHAT_PAY_SERIAL_NO:'ABC123',
 WECHAT_PAY_PRIVATE_KEY_PATH:'/invalid/path',WECHAT_PAY_PUBLIC_KEY_PATH:'/invalid/pub',
 WECHAT_PAY_PUBLIC_KEY_ID:'PUB_KEY_ID_123456',
 WECHAT_PAY_NOTIFY_URL:'https://www.socthink.cn/api/subscription/callback/wechat'
};
const result=inspectWeChatPay(conf);
for(const code of ['APPID_MISMATCH','NATIVE_NOT_MINIAPP','WRONG_CALLBACK','NO_BILLING_DB'])assert.ok(result.issues.some(x=>x.code===code),code);
assert.equal(JSON.stringify(result).includes('merchant_secret_id'),false);
assert.equal(JSON.stringify(result).includes(conf.WECHAT_PAY_API_V3_KEY),false);
const fixed=inspectWeChatPay({...conf,WECHAT_PAY_APPID:'wx_mini',PAYMENT_PROVIDER:'wechat_virtual',WECHAT_PAY_NOTIFY_URL:'https://socthink.cn/api/payments/wechat/notify'});
for(const code of ['APPID_MISMATCH','NATIVE_NOT_MINIAPP','WRONG_CALLBACK'])assert.equal(fixed.issues.some(x=>x.code===code),false,code);
assert.ok(fixed.issues.some(x=>x.code==='NO_VIRTUAL_CONFIG'));
console.log('WECHAT_PAY_READINESS_TEST_PASS: wrong APPID/provider/callback rejected without exposing credentials.');
