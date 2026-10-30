import assert from "node:assert/strict";
import {
  createCipheriv, generateKeyPairSync, randomBytes, sign,
  verify as verifySignature,
} from "node:crypto";
import {
  prepareWechatNativeRequest, prepareWechatNativeQuery, signWechatV3Request,
  verifyWechatV3Notification, decryptWechatV3Resource,
  matchWechatPaidTrade, WechatPaymentProtocolError,
} from "../src/lib/wechat-native-payment";

// Only ephemeral in-memory RSA test keys; no real merchant or user data.
const merchant = generateKeyPairSync("rsa", {modulusLength:2048});
const platform = generateKeyPairSync("rsa", {modulusLength:2048});
const testConfig = {
  appId: "wx1234567890abcdef",merchantId:"1234567890",
  merchantCertificateSerial:"AABBCCDD01234567",
  merchantPrivateKey:merchant.privateKey,
  notifyUrl:"https://test.example.com/api/payments/wechat/notify",
  allowedNotifyOrigins:["https://test.example.com"],
};
const snapshot = {
  orderId:"ord_fixture_123456",description:"Synthetic verified test",
  amountMinor:199,currency:"CNY" as const,
};
const timestamp=1793366400,nonce="0123456789abcdeffedcba9876543210";
const request=prepareWechatNativeRequest(testConfig,snapshot,timestamp,nonce);
assert.equal(request.method,"POST");
const query=prepareWechatNativeQuery(testConfig,snapshot.orderId,timestamp,nonce);
assert.equal(query.method,"GET");
assert.equal(query.url,"https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/"+snapshot.orderId+"?mchid="+testConfig.merchantId);
const querySignature=query.headers.Authorization.match(/signature="([^"]+)"/)?.[1];
assert.ok(querySignature);
assert.equal(verifySignature("RSA-SHA256",Buffer.from(`GET\n/v3/pay/transactions/out-trade-no/${snapshot.orderId}?mchid=${testConfig.merchantId}\n${timestamp}\n${nonce}\n\n`),merchant.publicKey,Buffer.from(querySignature,"base64")),true);
assert.throws(()=>prepareWechatNativeQuery(testConfig,"../escape",timestamp,nonce),WechatPaymentProtocolError);
assert.equal(request.url,"https://api.mch.weixin.qq.com/v3/pay/transactions/native");
assert.equal(JSON.parse(request.bodyText).amount.total,199);
const auth=request.headers.Authorization;
const encoded=auth.match(/signature="([^"]+)"/)?.[1];
assert.ok(encoded);
const verifyMessage=`POST\n/v3/pay/transactions/native\n${timestamp}\n${nonce}\n${request.bodyText}\n`;
assert.equal(verifySignature("RSA-SHA256",Buffer.from(verifyMessage),merchant.publicKey,Buffer.from(encoded,"base64")),true);
assert.equal(verifySignature("RSA-SHA256",Buffer.from(verifyMessage+" "),merchant.publicKey,Buffer.from(encoded,"base64")),false);
assert.equal(signWechatV3Request("POST","/v3/pay/transactions/native",timestamp,nonce,request.bodyText,merchant.privateKey),encoded);

for(const changed of [
  {...snapshot, amountMinor:-1}, {...snapshot, amountMinor:0},
  {...snapshot,orderId:"invalid order"}, {...snapshot,currency:"USD" as "CNY"},
  {...snapshot,description:""}
]) assert.throws(()=>prepareWechatNativeRequest(testConfig,changed,timestamp,nonce),WechatPaymentProtocolError);
assert.throws(()=>prepareWechatNativeRequest({...testConfig,notifyUrl:"https://other.example.com/api/payments/wechat/notify"},snapshot,timestamp,nonce),WechatPaymentProtocolError);
assert.throws(()=>prepareWechatNativeRequest({...testConfig,notifyUrl:"http://test.example.com/api/payments/wechat/notify"},snapshot,timestamp,nonce),WechatPaymentProtocolError);
assert.throws(()=>prepareWechatNativeRequest({...testConfig,merchantPrivateKey:merchant.publicKey},snapshot,timestamp,nonce),WechatPaymentProtocolError);
assert.throws(()=>prepareWechatNativeRequest({...testConfig,allowedNotifyOrigins:[]},snapshot,timestamp,nonce),WechatPaymentProtocolError);

const rawBody=JSON.stringify({id:"synthetic-event",resource:{algorithm:"AEAD_AES_256_GCM"}});
const responseMessage=`${timestamp}\n${nonce}\n${rawBody}\n`;
const platformSignature = sign("RSA-SHA256",Buffer.from(responseMessage),platform.privateKey).toString("base64");
const validHeaders={
  "wechatpay-serial":"PUB_KEY_ID_3000000000",
  "WECHATPAY-signature":platformSignature,
  "Wechatpay-Timestamp":String(timestamp),
  "wechatpay-NONCE":nonce,
  "wechatpay-signature-type":"WECHATPAY2-SHA256-RSA2048",
};
const input={
  headers:validHeaders,rawBody,
  wechatPayPublicKey:platform.publicKey,
  expectedWechatPaySerial:"PUB_KEY_ID_3000000000",nowSeconds:timestamp,
};
assert.equal(verifyWechatV3Notification(input).ok,true);
assert.equal(verifyWechatV3Notification({...input,rawBody:rawBody+" "}).code,"INVALID_SIGNATURE");
assert.equal(verifyWechatV3Notification({...input,expectedWechatPaySerial:"PUB_KEY_ID_1111111111"}).code,"UNTRUSTED_SERIAL");
assert.equal(verifyWechatV3Notification({...input,nowSeconds:timestamp+301}).code,"STALE_TIMESTAMP");
assert.equal(verifyWechatV3Notification({...input,nowSeconds:timestamp-301}).code,"STALE_TIMESTAMP");
assert.equal(verifyWechatV3Notification({...input,wechatPayPublicKey:merchant.publicKey}).code,"INVALID_SIGNATURE");
assert.equal(verifyWechatV3Notification({...input,headers:{...validHeaders,"WECHATPAY-signature":"WECHATPAY/SIGNTEST/bad"}}).code,"SIGNATURE_PROBE");
assert.equal(verifyWechatV3Notification({...input,headers:{...validHeaders,"WECHATPAY-signature":"bogus"}}).code,"INVALID_SIGNATURE");

const key=randomBytes(32),gcmNonce="123456789012",aad="transaction",transaction={
  mchid:testConfig.merchantId,appid:testConfig.appId,
  out_trade_no:snapshot.orderId,trade_state:"SUCCESS",trade_type:"NATIVE",
  transaction_id:"wx_synthetic_txn_1",amount:{total:snapshot.amountMinor,currency:"CNY"},
};
const cipher=createCipheriv("aes-256-gcm",key,Buffer.from(gcmNonce));
cipher.setAAD(Buffer.from(aad));
const encrypted=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(transaction))),cipher.final(),cipher.getAuthTag()]);
const resource={algorithm:"AEAD_AES_256_GCM",ciphertext:encrypted.toString("base64"),nonce:gcmNonce,associated_data:aad};
const plain=decryptWechatV3Resource(resource,key);
assert.deepEqual(plain,transaction);
assert.throws(()=>decryptWechatV3Resource(resource,randomBytes(32)),WechatPaymentProtocolError);
assert.throws(()=>decryptWechatV3Resource({...resource,ciphertext:encrypted.toString("base64").slice(0,-3)+"aaa"},key),WechatPaymentProtocolError);
assert.throws(()=>decryptWechatV3Resource({...resource,algorithm:"PLAINTEXT"},key),WechatPaymentProtocolError);

const expected={merchantId:testConfig.merchantId,appId:testConfig.appId,orderId:snapshot.orderId,amountMinor:199};
assert.equal(matchWechatPaidTrade({callbackTrade:transaction,officialQueriedTrade:transaction,expected}).ok,true);
assert.equal(matchWechatPaidTrade({callbackTrade:transaction,officialQueriedTrade:{...transaction,transaction_id:"wx_other"},expected}).code,"TRANSACTION_MISMATCH");
assert.equal(matchWechatPaidTrade({callbackTrade:transaction,officialQueriedTrade:{...transaction,amount:{total:200,currency:"CNY"}},expected}).code,"PAYMENT_MISMATCH");
assert.equal(matchWechatPaidTrade({callbackTrade:{...transaction,trade_state:"NOTPAY"},officialQueriedTrade:transaction,expected}).code,"PAYMENT_MISMATCH");
assert.equal(matchWechatPaidTrade({callbackTrade:transaction,officialQueriedTrade:{...transaction,mchid:"other"},expected}).code,"PAYMENT_MISMATCH");
assert.equal(matchWechatPaidTrade({callbackTrade:transaction,officialQueriedTrade:{...transaction,appid:"other"},expected}).code,"PAYMENT_MISMATCH");
console.log("WECHAT_NATIVE_BOUNDARY=PASS (signed exact body, callback case/clock/serial, AES-GCM, official query match, no live money)");
