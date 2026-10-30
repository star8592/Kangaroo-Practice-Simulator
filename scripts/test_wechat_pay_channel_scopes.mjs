import assert from 'node:assert/strict';
import { inspectWeChatPay } from './check_wechat_pay_readiness.mjs';

const fixture = {
  WECHAT_MINIAPP_APPID:'wx_mini_fixture',
  WECHAT_PAY_APPID:'wx_web_fixture',
  PAYMENT_PROVIDER:'wechat_native',
  WECHAT_PAY_MCHID:'synthetic_merchant_id',
  WECHAT_PAY_API_V3_KEY:'X'.repeat(32),
  WECHAT_PAY_SERIAL_NO:'ABCDEF123456',
  WECHAT_PAY_PRIVATE_KEY_PATH:'/fake/private.pem',
  WECHAT_PAY_PUBLIC_KEY_PATH:'/fake/platform.pem',
  WECHAT_PAY_PUBLIC_KEY_ID:'PUB_KEY_ID_3000000000',
  WECHAT_PAY_NOTIFY_URL:'https://socthink.cn/api/payments/wechat/notify',
  SOCTHINK_BILLING_DATABASE_URL:'synthetic_server_only_value',
};
const web=inspectWeChatPay({...fixture,SOCTHINK_PAYMENT_SURFACE:'web-native'});
assert.ok(!web.issues.some(v=>v.code==='APPID_MISMATCH'));
assert.ok(!web.issues.some(v=>v.code==='NATIVE_NOT_MINIAPP'));
assert.ok(!web.issues.some(v=>v.code==='APPID_MISSING'));
assert.ok(web.issues.some(v=>v.code==='PRIVATE_KEY_UNREADABLE'));
assert.equal(web.ok,false); // Fake keys are not real payment readiness.
const mini=inspectWeChatPay({...fixture,SOCTHINK_PAYMENT_SURFACE:'miniapp-virtual'});
assert.ok(mini.issues.some(v=>v.code==='APPID_MISMATCH'));
assert.ok(mini.issues.some(v=>v.code==='NATIVE_NOT_MINIAPP'));
assert.ok(mini.issues.some(v=>v.code==='NO_VIRTUAL_CONFIG'));
const virtual=inspectWeChatPay({
  ...fixture,PAYMENT_PROVIDER:'wechat_virtual',SOCTHINK_PAYMENT_SURFACE:'miniapp-virtual',
  WECHAT_VIRTUAL_OFFER_ID:'synthetic_offer',WECHAT_VIRTUAL_APPKEY:'synthetic_key',
  WECHAT_PAY_APPID:undefined,
});
assert.ok(!virtual.issues.some(v=>v.code==='APPID_MISSING'));
assert.ok(!virtual.issues.some(v=>v.code==='PRIVATE_KEY_UNREADABLE'));
assert.ok(!virtual.issues.some(v=>v.code==='API_V3_KEY_INVALID'));
assert.ok(virtual.needsOfficialVerification.some(x=>x.includes('authorization')));
const invalid=inspectWeChatPay({...fixture,PAYMENT_PROVIDER:'wechat_virtual',SOCTHINK_PAYMENT_SURFACE:'web-native'});
assert.ok(invalid.issues.some(v=>v.code==='INVALID_PROVIDER'));
const result=JSON.stringify({web,mini,virtual,invalid});
for(const secret of [fixture.WECHAT_PAY_API_V3_KEY,fixture.SOCTHINK_BILLING_DATABASE_URL,fixture.WECHAT_PAY_MCHID])
  assert.ok(!result.includes(secret));
console.log('WECHAT_PAYMENT_SCOPE=PASS (PC Native vs virtual miniapp independence; no credentials emitted)');
