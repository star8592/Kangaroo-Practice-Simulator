import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {
  createVerifiedWechatNativeCheckout,queryVerifiedWechatNativePayment,
  type WechatNativeTransport,
} from "../src/lib/wechat-native-transport";
import {WechatPaymentProtocolError} from "../src/lib/wechat-native-payment";

// Synthetic cryptographic fixture, no network, no merchant credentials.
const merchant=generateKeyPairSync("rsa",{modulusLength:2048});
const platform=generateKeyPairSync("rsa",{modulusLength:2048});
const nowSeconds=1793366400;
const nonce="0123456789abcdeffedcba9876543210";
const merchantConfig={
  appId:"wxd678efh567hg6787",
  merchantId:"1234567890",
  merchantCertificateSerial:"AABBCCDDEEFF01",
  merchantPrivateKey:merchant.privateKey,
  notifyUrl:"https://test.example.com/api/payments/wechat/notify",
  allowedNotifyOrigins:["https://test.example.com"],
};
const order={orderId:"ord_synthetic_777",description:"Synthetic exam fixture",amountMinor:300,currency:"CNY" as const};
const context={
  merchant:merchantConfig,wechatPayPublicKey:platform.publicKey,
  wechatPayPublicKeyId:"PUB_KEY_ID_3000000000",nowSeconds,nonce,
};
function signedResponse(data:Record<string,unknown>,options?:{alterSignature?:boolean,status?:number}) {
  const text=JSON.stringify(data);
  const sig=sign("RSA-SHA256",Buffer.from(`${nowSeconds}\n${nonce}\n${text}\n`),platform.privateKey).toString("base64");
  return new Response(text,{
    status:options?.status ?? 200,
    headers:{
      "Wechatpay-Timestamp":String(nowSeconds),
      "Wechatpay-Nonce":nonce,
      "Wechatpay-Serial":context.wechatPayPublicKeyId,
      "Wechatpay-Signature":options?.alterSignature?sig.slice(0,-10)+"XXXXXXXXXX":sig,
    },
  });
}
let calls=0;
const validNativeUrl="weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&groupid=00";
const fake:WechatNativeTransport=async (url,init) => {
  calls+=1;
  assert.equal(url,"https://api.mch.weixin.qq.com/v3/pay/transactions/native");
  assert.equal(init.method,"POST");
  assert.equal((init.body as string).includes(order.orderId),true);
  assert.ok((init.headers as Record<string,string>).Authorization.startsWith("WECHATPAY2-SHA256-RSA2048 "));
  assert.equal(init.redirect,"error");
  return signedResponse({code_url:validNativeUrl});
};
async function run() {
const c=await createVerifiedWechatNativeCheckout({...context,transport:fake},order);
assert.deepEqual(c,{orderId:order.orderId,codeUrl:validNativeUrl});
assert.equal(calls,1);
const failed:WechatNativeTransport=async()=>signedResponse({code_url:validNativeUrl},{alterSignature:true});
await assert.rejects(()=>createVerifiedWechatNativeCheckout({...context,transport:failed},order),WechatPaymentProtocolError);
const bogus:WechatNativeTransport=async()=>signedResponse({code_url:"https://thirdparty.example.com/qr.png"});
await assert.rejects(()=>createVerifiedWechatNativeCheckout({...context,transport:bogus},order),WechatPaymentProtocolError);
for(const invalidCode of [
  "weixin://evil.example.com/bizpayurl/up?pr=NwY5Mz9",
  "weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&redirect=https://evil.example",
  "weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&pr=OTHER",
  "weixin://wxpay/bizpayurl/up?pr=NwY5Mz9#fragment",
]) {
  const mock:WechatNativeTransport=async()=>signedResponse({code_url:invalidCode});
  await assert.rejects(()=>createVerifiedWechatNativeCheckout({...context,transport:mock},order),WechatPaymentProtocolError);
}
const noNetwork:WechatNativeTransport=async()=>{throw new Error("SENSITIVE_INTERNAL_TRANSPORT_DETAIL");};
await assert.rejects(()=>createVerifiedWechatNativeCheckout({...context,transport:noNetwork},order),
  (e:unknown)=>e instanceof WechatPaymentProtocolError && e.code==="WECHAT_NETWORK_FAILURE" && !String(e).includes("SENSITIVE"));
const badStatus:WechatNativeTransport=async()=>signedResponse({message:"SENSITIVE_PROVIDER_BODY"},{status:500});
await assert.rejects(()=>createVerifiedWechatNativeCheckout({...context,transport:badStatus},order),
  (e:unknown)=>e instanceof WechatPaymentProtocolError && e.code==="WECHAT_DOWNSTREAM_STATUS" && !String(e).includes("SENSITIVE"));
const paid={
  mchid:merchantConfig.merchantId,appid:merchantConfig.appId,out_trade_no:order.orderId,
  trade_state:"SUCCESS",trade_type:"NATIVE",transaction_id:"synthetic_wx_txn_01",
  amount:{total:300,currency:"CNY"},
};
const query:WechatNativeTransport=async (url,init)=>{
  assert.ok(url.includes("/v3/pay/transactions/out-trade-no/"+order.orderId));
  assert.equal(init.method,"GET");
  assert.equal(init.body,undefined);
  return signedResponse(paid);
};
const verified=await queryVerifiedWechatNativePayment({...context,transport:query},order);
assert.equal(verified.status,"VERIFIED_PAID");
assert.equal(verified.transactionId,paid.transaction_id);
assert.match(verified.verifiedBodySha256 ?? "",/^[0-9a-f]{64}$/);
const notPaid:WechatNativeTransport=async()=>signedResponse({...paid,trade_state:"NOTPAY"});
assert.deepEqual(await queryVerifiedWechatNativePayment({...context,transport:notPaid},order),{status:"NOT_PAID"});
const different:WechatNativeTransport=async()=>signedResponse({...paid,amount:{total:999,currency:"CNY"}});
await assert.rejects(()=>queryVerifiedWechatNativePayment({...context,transport:different},order),WechatPaymentProtocolError);
const wrong:WechatNativeTransport=async()=>signedResponse({...paid,out_trade_no:"other_order"});
await assert.rejects(()=>queryVerifiedWechatNativePayment({...context,transport:wrong},order),WechatPaymentProtocolError);
console.log("WECHAT_NATIVE_TRANSPORT=PASS (exact signed payload, verified provider response, query, no third-party QR or live charge)");

}
run().catch(error=>{console.error(error);process.exitCode=1});
