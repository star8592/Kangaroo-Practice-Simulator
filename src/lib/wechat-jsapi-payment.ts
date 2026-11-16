/**
 * Offline, pure protocol support for same-phone WeChat JSAPI.
 * NO network calls, orders, payment activation, or customer OpenID exposure.
 * Uses the existing central merchant credentials and the exact signed bytes.
 */
import {randomBytes,sign,type KeyObject} from "node:crypto";
import {prepareWechatNativeRequest,signWechatV3Request,
 type NativeMerchantConfig,type NativeOrderSnapshot} from "./wechat-native-payment";

const openidPattern=/^[a-zA-Z0-9_-]{8,128}$/;
const prepayPattern=/^[a-zA-Z0-9_-]{12,128}$/;

export function jsapiReadiness(input:{
  merchantAppId:string|undefined;officialAppId:string|undefined;
  officialOpenId:string|undefined;approved:boolean;enabled:boolean;
}) {
  if(!input.enabled||!input.approved)return {ready:false,code:"JSAPI_NOT_ACTIVATED"} as const;
  if(!input.merchantAppId||!input.officialAppId||
     input.merchantAppId!==input.officialAppId)
    return {ready:false,code:"OFFICIAL_APPID_MERCHANT_MISMATCH"} as const;
  if(!input.officialOpenId||!openidPattern.test(input.officialOpenId))
    return {ready:false,code:"OFFICIAL_OPENID_REQUIRED"} as const;
  return {ready:true,code:"JSAPI_CONFIG_ELIGIBLE"} as const;
}
export function prepareWechatJsapiRequest(
  config:NativeMerchantConfig,
  order:NativeOrderSnapshot,
  officialOpenId:string,
  timestamp:number,
  nonce:string,
) {
  if(!openidPattern.test(officialOpenId))throw Error("OFFICIAL_OPENID_INVALID");
  // Reuse all immutable checkout checks from the original Native protocol.
  const native=prepareWechatNativeRequest(config,order,timestamp,nonce);
  const data=JSON.parse(native.bodyText) as Record<string,unknown>;
  data.payer={openid:officialOpenId};
  const bodyText=JSON.stringify(data);
  const path="/v3/pay/transactions/jsapi";
  const signature=signWechatV3Request("POST",path,timestamp,nonce,bodyText,config.merchantPrivateKey);
  return {
    method:"POST" as const,
    url:"https://api.mch.weixin.qq.com"+path,
    headers:{
      Authorization:"WECHATPAY2-SHA256-RSA2048 mchid=\""+config.merchantId+
        "\",nonce_str=\""+nonce+"\",signature=\""+signature+"\",timestamp=\""+
        timestamp+"\",serial_no=\""+config.merchantCertificateSerial+"\"",
      Accept:"application/json",
      "Content-Type":"application/json",
    },
    bodyText,orderId:order.orderId,
  };
}
export function signWechatJsapiPayParameters(input:{
  appId:string;prepayId:string;merchantPrivateKey:KeyObject;
  timestamp:number;nonce?:string;
}) {
  if(!/^wx[a-zA-Z0-9]{16}$/.test(input.appId)||
     !prepayPattern.test(input.prepayId)||
     !Number.isSafeInteger(input.timestamp)||input.timestamp<1_600_000_000||
     input.merchantPrivateKey.type!=="private"||
     input.merchantPrivateKey.asymmetricKeyType!=="rsa")
    throw Error("INVALID_JSAPI_SIGNING_CONTEXT");
  const nonce=input.nonce??randomBytes(16).toString("hex");
  if(!/^[a-zA-Z0-9]{16,32}$/.test(nonce))throw Error("INVALID_JSAPI_NONCE");
  const pkg="prepay_id="+input.prepayId;
  const timeStamp=String(input.timestamp);
  const signedBytes=[input.appId,timeStamp,nonce,pkg,""].join("\n");
  const paySign=sign("RSA-SHA256",Buffer.from(signedBytes),input.merchantPrivateKey).toString("base64");
  return {
    appId:input.appId,timeStamp,nonceStr:nonce,package:pkg,
    signType:"RSA" as const,paySign,
  };
}
