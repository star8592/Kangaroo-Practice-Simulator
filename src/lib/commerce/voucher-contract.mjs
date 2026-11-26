// Isolated voucher primitive; no API, database or issuance side effects.
// Only verified provider adapters may construct the receipt passed into this module.
import {createHmac, timingSafeEqual} from "node:crypto";
const channels=new Set(["xiaohongshu","douyin","taobao"]);
const id=/^[A-Za-z0-9_.:-]{1,128}$/;
export function validateVoucherUnit(unit){
  if(!unit || !channels.has(unit.channel) || !id.test(unit.merchantId??"") ||
     !id.test(unit.orderLineId??"") || !Number.isSafeInteger(unit.unitIndex) ||
     unit.unitIndex<0 || unit.unitIndex>9999) throw new Error("Invalid voucher unit");
  return JSON.stringify([unit.channel,unit.merchantId,unit.orderLineId,unit.unitIndex]);
}
function keyBuffer(key){
  if(!Buffer.isBuffer(key)||key.length<32) throw new Error("Voucher key must contain at least 256 bits");
  return key;
}
// Versioned, deterministic, 192-bit pseudorandom code: retry generates the same code.
// Separate independently generated issuance/lookup secrets; never log or store raw codes.
export function deriveVoucherCode(unit,key,version=1){
  if(!Number.isSafeInteger(version)||version<1||version>9999)throw new Error("Invalid key version");
  const mac=createHmac("sha256",keyBuffer(key)).update("soc-voucher-issue-v"+version+"\0"+validateVoucherUnit(unit)).digest().subarray(0,24);
  return "SOC-"+version+"-"+mac.toString("base64url");
}
export function voucherLookupDigest(code,key){
  if(typeof code!=="string" || !/^SOC-[1-9][0-9]{0,3}-[A-Za-z0-9_-]{32}$/.test(code))throw new Error("Invalid voucher code");
  return createHmac("sha256",keyBuffer(key)).update("soc-voucher-lookup\0"+code).digest("hex");
}
export function voucherCodeMatches(code,digest,key){
  if(typeof digest!=="string"||!/^[a-f0-9]{64}$/.test(digest))return false;
  try{return timingSafeEqual(Buffer.from(voucherLookupDigest(code,key),"hex"),Buffer.from(digest,"hex"));}catch{return false;}
}
// Pure transition planner: caller MUST lock the durable voucher and source order,
// verify channel settlement/refund server-side, and atomically commit the grant/revoke.
export function planVoucherClaim({state,orderState,ownerId,expiresAt},actor,now){
  if(!id.test(actor??"")||!Number.isFinite(now)||!Number.isFinite(expiresAt))throw new Error("Invalid claim");
  if(orderState!=="paid"||now>=expiresAt||state==="revoked")throw new Error("Voucher unavailable");
  if(state==="claimed"){
    if(actor!==ownerId)throw new Error("Voucher unavailable");
    return "already_claimed";
  }
  if(state!=="issued"||ownerId!==null)throw new Error("Voucher unavailable");
  return "claim_and_grant_atomically";
}
export function planVoucherRefund(state){
  if(state==="revoked")return "already_revoked";
  if(state==="issued")return "revoke_unclaimed";
  if(state==="claimed")return "revoke_grant_preserve_history";
  throw new Error("Invalid voucher state");
}
