import assert from "node:assert/strict";
import {generateKeyPairSync,verify} from "node:crypto";
import {
  jsapiReadiness,signWechatJsapiPayParameters,prepareWechatJsapiRequest,
} from "../src/lib/wechat-jsapi-payment";
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const appId="wx"+"1".repeat(16);
const merchant={
  appId,merchantId:"1234567890",merchantCertificateSerial:"A".repeat(24),
  notifyUrl:"https://socthink.cn/api/payments/wechat/notify",
  allowedNotifyOrigins:["https://socthink.cn"],merchantPrivateKey:privateKey,
};
const orgOpenId="o".repeat(28);
const o={
  orderId:"ord_"+"1".repeat(24),description:"SOC THINK 机构席位",
  amountMinor:3900,currency:"CNY" as const,
};
const now=1794866400;
const proof=prepareWechatJsapiRequest(merchant,o,orgOpenId,now,"A".repeat(32));
assert.equal(proof.url,"https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi");
assert.equal((JSON.parse(proof.bodyText) as {payer:{openid:string}}).payer.openid,orgOpenId);
assert(!proof.bodyText.includes("wechatUnionId"));
assert(proof.headers.Authorization.includes("WECHATPAY2"));
const js=signWechatJsapiPayParameters({
  appId,prepayId:"wx201410272009395522657a690389285100",
  merchantPrivateKey:privateKey,timestamp:now,nonce:"N".repeat(32),
});
assert.equal(js.package,"prepay_id=wx201410272009395522657a690389285100");
const signingMessage=[js.appId,js.timeStamp,js.nonceStr,js.package,""].join("\n");
assert(verify("RSA-SHA256",Buffer.from(signingMessage),publicKey,Buffer.from(js.paySign,"base64")));
assert(!verify("RSA-SHA256",Buffer.from(signingMessage+"wrong"),publicKey,Buffer.from(js.paySign,"base64")));
assert.equal(jsapiReadiness({
  merchantAppId:appId,officialAppId:appId,officialOpenId:orgOpenId,
  approved:true,enabled:true,
}).ready,true);
assert.equal(jsapiReadiness({
  merchantAppId:appId,officialAppId:"wx"+"2".repeat(16),officialOpenId:orgOpenId,
  approved:true,enabled:true,
}).code,"OFFICIAL_APPID_MERCHANT_MISMATCH");
assert.equal(jsapiReadiness({
  merchantAppId:appId,officialAppId:appId,officialOpenId:undefined,
  approved:true,enabled:true,
}).code,"OFFICIAL_OPENID_REQUIRED");
assert.equal(jsapiReadiness({
  merchantAppId:appId,officialAppId:appId,officialOpenId:orgOpenId,
  approved:false,enabled:true,
}).ready,false);
assert.throws(()=>prepareWechatJsapiRequest(merchant,o,"bad",now,"A".repeat(32)));
console.log("JSAPI_PURE_PROTOCOL=PASS official_appid_openid_binding rsa_request_and_frontend_sign no_external_charge");
