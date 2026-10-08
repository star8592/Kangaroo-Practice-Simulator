import crypto from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type { AccessGrant } from "./access-policy";

// Internal transactional ledger; no HTTP handler exposes settlement mutations.
export type VerifiedPaymentReceipt = {
  provider: "wechat_pay";
  eventId: string;
  orderId: string;
  transactionId: string;
  amountMinor: number;
  currency: string;
  payloadSha256: string;
  verifiedAt: Date;
  signatureVerified: true;
  providerStatusConfirmed: true;
};
export class BillingConflictError extends Error {}
export class BillingQuotaExceededError extends Error {}
let pool: Pool | undefined;
export function billingConfigured() { return Boolean(process.env.SOCTHINK_BILLING_DATABASE_URL?.trim()); }
export function billingPool() {
  const connectionString=process.env.SOCTHINK_BILLING_DATABASE_URL?.trim();
  if(!connectionString) throw new Error("Billing database not configured");
  if(!pool) pool=new Pool({connectionString,max:4,connectionTimeoutMillis:3000,idleTimeoutMillis:10000,application_name:"socthink-billing"});
  return pool;
}
export async function closeBillingPoolForTests() {
  if(pool) {const previous=pool;pool=undefined;await previous.end();}
}
async function transaction<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T>{
  const c=await billingPool().connect();
  try {await c.query("BEGIN");const result=await fn(c);await c.query("COMMIT");return result;}
  catch(error){await c.query("ROLLBACK");throw error;}
  finally{c.release();}
}
const identifier=(id:string)=>{
  if(!id || id.length>256)throw new BillingConflictError("Invalid identifier");
  return id;
};
export async function createBillingOrder(parentId:string,productId:string){
  if(!/^par_[a-zA-Z0-9_]+$/.test(parentId))throw new BillingConflictError("Invalid parent account");
  identifier(productId);
  return transaction(async c=>{
    const product=await c.query<{amount_minor:string;currency:string}>(
      "SELECT amount_minor,currency FROM billing_products WHERE id=$1 AND enabled=true",[productId]);
    if(!product.rows[0])throw new BillingConflictError("Product unavailable");
    const id="ord_"+crypto.randomBytes(12).toString("hex");
    const p=product.rows[0];
    await c.query("INSERT INTO billing_orders(id,payer_parent_id,product_id,price_minor,currency,provider) VALUES($1,$2,$3,$4,$5,'wechat_pay')",
      [id,parentId,productId,p.amount_minor,p.currency]);
    return {id,priceMinor:Number(p.amount_minor),currency:p.currency};
  });
}
function validateReceipt(r:VerifiedPaymentReceipt){
  identifier(r.eventId);identifier(r.orderId);identifier(r.transactionId);
  if(r.provider!=="wechat_pay" || r.signatureVerified!==true || r.providerStatusConfirmed!==true ||
     !/^[0-9a-f]{64}$/.test(r.payloadSha256) || !Number.isSafeInteger(r.amountMinor) ||
     r.amountMinor<0 || !/^[A-Z]{3}$/.test(r.currency) ||
     !(r.verifiedAt instanceof Date) || !Number.isFinite(r.verifiedAt.getTime()))
     throw new BillingConflictError("Unverified payment receipt");
}
/** Payment adapter must verify official signature and independently query transaction before calling. */
export async function settleVerifiedOrder(r:VerifiedPaymentReceipt){
  validateReceipt(r);
  return transaction(async c=>{
    const result=await c.query<{
      id:string;payer_parent_id:string;price_minor:string;currency:string;provider:string;
      provider_transaction_id:string|null;state:string;tier:"plus"|"pro";period:"month"|"year";
    }>("SELECT o.*,p.tier,p.period FROM billing_orders o JOIN billing_products p ON p.id=o.product_id WHERE o.id=$1 FOR UPDATE OF o",[r.orderId]);
    const o=result.rows[0];
    if(!o || o.provider!==r.provider || Number(o.price_minor)!==r.amountMinor || o.currency!==r.currency)
      throw new BillingConflictError("Provider order amount/currency mismatch");
    if(o.state==="paid"){
      if(o.provider_transaction_id!==r.transactionId)throw new BillingConflictError("Transaction already settled differently");
      const e=await c.query<{id:string}>("SELECT id FROM billing_entitlements WHERE source_order_id=$1",[o.id]);
      if(!e.rows[0])throw new BillingConflictError("Paid order without grant");
      return {orderId:o.id,grantId:e.rows[0].id,tier:o.tier,created:false};
    }
    if(o.state!=="pending")throw new BillingConflictError("Order not payable");
    await c.query("INSERT INTO billing_payment_events(provider,event_id,order_id,event_kind,transaction_id,verified_at,payload_sha256) VALUES($1,$2,$3,'paid',$4,$5,$6)",
      [r.provider,r.eventId,o.id,r.transactionId,r.verifiedAt,r.payloadSha256]);
    await c.query("UPDATE billing_orders SET state='paid',paid_at=$2,provider_transaction_id=$3 WHERE id=$1",
      [o.id,r.verifiedAt,r.transactionId]);
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[o.payer_parent_id+":"+o.tier]);
    const dates=await c.query<{starts_at:Date;ends_at:Date}>(
      "WITH p AS (SELECT MAX(ends_at) AS last_end FROM billing_entitlements WHERE payer_parent_id=$1 AND tier=$2 AND revoked_at IS NULL) SELECT GREATEST($3::timestamptz,COALESCE(last_end,$3::timestamptz)) AS starts_at,GREATEST($3::timestamptz,COALESCE(last_end,$3::timestamptz)) + (CASE WHEN $4='year' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END) AS ends_at FROM p",
      [o.payer_parent_id,o.tier,r.verifiedAt,o.period]);
    const id="ent_"+crypto.randomBytes(12).toString("hex");
    await c.query("INSERT INTO billing_entitlements(id,payer_parent_id,tier,source_order_id,starts_at,ends_at) VALUES($1,$2,$3,$4,$5,$6)",
      [id,o.payer_parent_id,o.tier,o.id,dates.rows[0].starts_at,dates.rows[0].ends_at]);
    return {orderId:o.id,grantId:id,tier:o.tier,created:true};
  });
}
export async function refundVerifiedOrder(r:VerifiedPaymentReceipt){
  validateReceipt(r);
  return transaction(async c=>{
    const rows=await c.query<{
      id:string;provider:string;price_minor:string;currency:string;provider_transaction_id:string|null;state:string;
    }>("SELECT * FROM billing_orders WHERE id=$1 FOR UPDATE",[r.orderId]);
    const o=rows.rows[0];
    if(!o || o.provider!==r.provider || Number(o.price_minor)!==r.amountMinor ||
       o.currency!==r.currency || o.provider_transaction_id!==r.transactionId)
       throw new BillingConflictError("Refund does not match settled payment");
    if(o.state==="refunded")return {orderId:o.id,revoked:false};
    if(o.state!=="paid")throw new BillingConflictError("Order not paid");
    await c.query("INSERT INTO billing_payment_events(provider,event_id,order_id,event_kind,transaction_id,verified_at,payload_sha256) VALUES($1,$2,$3,'refunded',$4,$5,$6)",
      [r.provider,r.eventId,o.id,r.transactionId,r.verifiedAt,r.payloadSha256]);
    await c.query("UPDATE billing_orders SET state='refunded',refunded_at=$2 WHERE id=$1",[o.id,r.verifiedAt]);
    await c.query("UPDATE billing_entitlements SET revoked_at=$2 WHERE source_order_id=$1 AND revoked_at IS NULL",[o.id,r.verifiedAt]);
    return {orderId:o.id,revoked:true};
  });
}
export async function verifiedGrantsForParent(parentId:string,now=new Date()):Promise<AccessGrant[]>{
  const rows=await billingPool().query<{
    payer_parent_id:string;tier:"plus"|"pro";starts_at:Date;ends_at:Date;revoked_at:Date|null;
  }>("SELECT e.payer_parent_id,e.tier,e.starts_at,e.ends_at,e.revoked_at FROM billing_entitlements e JOIN billing_orders o ON o.id=e.source_order_id WHERE e.payer_parent_id=$1 AND o.state='paid' AND e.starts_at<=$2 AND e.ends_at>$2 AND (e.revoked_at IS NULL OR e.revoked_at>$2)",
    [parentId,now]);
  return rows.rows.map(e=>({ownerId:e.payer_parent_id,tier:e.tier,verified:true,startsAt:e.starts_at.getTime(),expiresAt:e.ends_at.getTime(),revokedAt:e.revoked_at?.getTime()}));
}
export async function verifiedParentsForStudent(studentId:string):Promise<string[]>{
  const x=await billingPool().query<{parent_id:string}>("SELECT parent_id FROM billing_family_links WHERE student_id=$1 AND status='active'",[studentId]);
  return x.rows.map(r=>r.parent_id);
}
export async function linkVerifiedFamilyMember(parentId:string,studentId:string,guardianVerifiedAt:Date){
  if(!/^par_[a-zA-Z0-9_]+$/.test(parentId) ||
     !/^(stu|wx)_[a-zA-Z0-9_]+$/.test(studentId) ||
     !(guardianVerifiedAt instanceof Date) || !Number.isFinite(guardianVerifiedAt.getTime()))
    throw new BillingConflictError("Invalid verified family link");
  await billingPool().query("INSERT INTO billing_family_links(parent_id,student_id,status,guardian_verified_at) VALUES($1,$2,'active',$3) ON CONFLICT(parent_id,student_id) DO UPDATE SET status='active',guardian_verified_at=EXCLUDED.guardian_verified_at",
    [parentId,studentId,guardianVerifiedAt]);
}
export async function consumeUsage(input:{
  parentId:string;capability:string;periodStart:Date;periodEnd:Date;
  capacity:number;units:number;idempotencyKey:string;actionId:string;
}):Promise<{remaining:number;duplicated:boolean}>{
  const {parentId,capability,periodStart,periodEnd,capacity,units,idempotencyKey,actionId}=input;
  if(!parentId || !capability || !idempotencyKey || !actionId || !Number.isSafeInteger(capacity) ||
     capacity<0 || !Number.isSafeInteger(units) || units<1 ||
     !Number.isFinite(periodStart.getTime()) || !Number.isFinite(periodEnd.getTime()) ||
     periodEnd.getTime()<=periodStart.getTime())throw new BillingConflictError("Invalid usage");
  return transaction(async c=>{
    await c.query("INSERT INTO billing_usage_buckets(payer_parent_id,capability,period_start,period_end,capacity) VALUES($1,$2,$3,$4,$5) ON CONFLICT(payer_parent_id,capability,period_start) DO NOTHING",
      [parentId,capability,periodStart,periodEnd,capacity]);
    const inserted=await c.query<{idempotency_key:string}>(
      "INSERT INTO billing_usage_events(idempotency_key,payer_parent_id,capability,period_start,units,action_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(idempotency_key) DO NOTHING RETURNING idempotency_key",
      [idempotencyKey,parentId,capability,periodStart,units,actionId]);
    const existing=await c.query<{payer_parent_id:string;capability:string;period_start:Date;units:number;action_id:string}>(
      "SELECT payer_parent_id,capability,period_start,units,action_id FROM billing_usage_events WHERE idempotency_key=$1",[idempotencyKey]);
    if(!inserted.rows[0] && existing.rows[0]){
      const e=existing.rows[0];
      if(e.payer_parent_id!==parentId || e.capability!==capability ||
         e.period_start.getTime()!==periodStart.getTime() || e.units!==units || e.action_id!==actionId)
        throw new BillingConflictError("Idempotency key reused");
      const b=await c.query<{capacity:number;used:number}>("SELECT capacity,used FROM billing_usage_buckets WHERE payer_parent_id=$1 AND capability=$2 AND period_start=$3",
        [parentId,capability,periodStart]);
      return {remaining:b.rows[0].capacity-b.rows[0].used,duplicated:true};
    }
    const b=await c.query<{capacity:number;used:number}>(
      "UPDATE billing_usage_buckets SET used=used+$4 WHERE payer_parent_id=$1 AND capability=$2 AND period_start=$3 AND used+$4<=capacity RETURNING capacity,used",
      [parentId,capability,periodStart,units]);
    if(!b.rows[0])throw new BillingQuotaExceededError("Quota exhausted");
    return {remaining:b.rows[0].capacity-b.rows[0].used,duplicated:false};
  });
}
