import crypto from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type { AccessGrant } from "./access-policy";
import {verifyDigitalResourceIntegrity,type DigitalResourceFile} from "./digital-resource-file";
import {DIGITAL_SALES_POLICY_VERSION} from "./digital-sales-policy";

// Internal transactional ledger; no HTTP handler exposes settlement mutations.
export type VerifiedPaymentReceipt = {
  provider: "wechat_pay" | "wechat_native";
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
export async function createBillingOrder(
  parentId:string,productId:string,
  provider:"wechat_pay"|"wechat_native"="wechat_pay",
  consent?:{policyVersion:string;acceptedAt:Date},
){
  if(!/^par_[a-zA-Z0-9_]+$/.test(parentId))throw new BillingConflictError("Invalid parent account");
  identifier(productId);
  if (!["wechat_pay", "wechat_native"].includes(provider))
    throw new BillingConflictError("Invalid provider");
  // The Web Native route must collect an explicit, unchecked-by-default
  // customer acknowledgement. Legacy non-Native internal callers remain
  // compatible; historical orders cannot be backfilled with fake consent.
  if(provider==="wechat_native" &&
     (!consent || consent.policyVersion!==DIGITAL_SALES_POLICY_VERSION ||
      !(consent.acceptedAt instanceof Date) ||
      !Number.isFinite(consent.acceptedAt.getTime())))
    throw new BillingConflictError("Digital sales policy confirmation required");
  return transaction(async c=>{
    const product=await c.query<{
      amount_minor:string;currency:string;product_kind:"subscription"|"item";
      content_kind:"exam"|"resource"|"report"|null;content_id:string|null;
      rights_approved:boolean;delivery_verified:boolean;access_restricted:boolean;title_zh:string|null;
    }>(
      "SELECT amount_minor,currency,product_kind,content_kind,content_id,rights_approved,delivery_verified,access_restricted,title_zh FROM billing_products WHERE id=$1 AND enabled=true",[productId]);
    if(!product.rows[0])throw new BillingConflictError("Product unavailable");
    const id="ord_"+crypto.randomBytes(12).toString("hex");
    const p=product.rows[0];
    // Item sales require separate verified content rights and a working delivery target.
    if(p.product_kind==="item" && (!p.rights_approved || !p.delivery_verified ||
        !p.access_restricted || !p.content_kind || !p.content_id ||
        !p.title_zh?.trim()))
      throw new BillingConflictError("Item unavailable for sale");
    if(p.product_kind!=="subscription" && p.product_kind!=="item")
      throw new BillingConflictError("Unsupported product");
    if(p.product_kind==="item" && p.content_kind==="report"){
      // Reports are ONLY our two registered self-exploration instruments.
      // A forged SQL row cannot sell an arbitrary private content target.
      const {getInstrument}=await import("./measurement-center");
      if(!getInstrument(p.content_id??""))throw new BillingConflictError("Unknown report instrument");
    }
    if(p.product_kind==="item" && p.content_kind==="resource"){
      // Never create a payable order for a missing, corrupted, unapproved
      // or public-directory file. A fixture metadata row alone is insufficient.
      const file=await c.query<DigitalResourceFile>(`
        SELECT sha256,size_bytes,file_name,mime_type
        FROM billing_resource_assets
        WHERE resource_id=$1 AND rights_approved=true AND delivery_verified=true
      `,[p.content_id]);
      if(!file.rows[0])throw new BillingConflictError("Resource is not deliverable");
      try{await verifyDigitalResourceIntegrity(file.rows[0]);}
      catch{throw new BillingConflictError("Resource file failed delivery verification");}
    }
    if(p.product_kind==="item"){
      // Prevent repeat sales of already-owned content. The advisory transaction
      // lock serializes buyer+content checks across concurrent checkout calls.
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [parentId+":"+p.content_kind+":"+p.content_id]);
      const owned=await c.query<{owned:boolean}>(`
        SELECT EXISTS (
          SELECT 1 FROM billing_item_entitlements e
          JOIN billing_orders o ON o.id=e.source_order_id
          WHERE e.payer_parent_id=$1 AND e.content_kind=$2
            AND e.content_id=$3 AND e.revoked_at IS NULL AND o.state='paid'
        ) AS owned`,[parentId,p.content_kind,p.content_id]);
      if(owned.rows[0]?.owned) throw new BillingConflictError("Item already owned");
      // Treat all pending orders as still payable. Never issue a second
      // WeChat QR with a different order number for the same item/buyer;
      // the first QR might still be scanned and charged later.
      const active=await c.query<{state:string}>(`
        SELECT state FROM billing_orders WHERE payer_parent_id=$1
          AND product_kind='item' AND content_kind=$2 AND content_id=$3
          AND state IN ('pending','paid') LIMIT 1
      `,[parentId,p.content_kind,p.content_id]);
      if(active.rows[0])throw new BillingConflictError(
        active.rows[0].state==="pending"?"Item payment already pending":"Item already owned"
      );
    }
    await c.query("INSERT INTO billing_orders(id,payer_parent_id,product_id,price_minor,currency,provider,product_kind,content_kind,content_id,title_snapshot,sales_policy_version,sales_policy_accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [id,parentId,productId,p.amount_minor,p.currency,provider,p.product_kind,p.content_kind,p.content_id,p.title_zh,
        consent?.policyVersion??null,consent?.acceptedAt??null]);
    return {id,priceMinor:Number(p.amount_minor),currency:p.currency};
  });
}
/** A verified provider CALLBACK, not yet an independently queried payment.
 * ACKing this records a recoverable fact; it never grants user rights.
 */
export type VerifiedNativeNotification = {
  orderId:string;
  eventId:string;
  transactionId:string;
  amountMinor:number;
  currency:"CNY";
  payloadSha256:string;
  signatureVerified:true;
  signedTradeMatched:true;
};

export async function recordVerifiedNativeNotification(n:VerifiedNativeNotification):Promise<"recorded"|"already_settled"> {
  identifier(n.orderId);identifier(n.eventId);identifier(n.transactionId);
  if (n.signatureVerified!==true || n.signedTradeMatched!==true ||
      !/^ord_[a-zA-Z0-9_-]{6,28}$/.test(n.orderId) ||
      !/^[0-9a-f]{64}$/.test(n.payloadSha256) ||
      !Number.isSafeInteger(n.amountMinor) || n.amountMinor<=0 ||
      n.currency!=="CNY")
    throw new BillingConflictError("Invalid Native payment callback evidence");
  // Single atomic WAL-backed UPDATE: on ACK success the existing recovery
  // worker can query WeChat independently. No callback needs an external API.
  const r=await billingPool().query<{id:string}>({
    text:`UPDATE billing_orders
      SET notification_received_at=now(),
          notification_event_id=$2,
          notification_transaction_id=$3,
          notification_payload_sha256=$4,
          reconcile_checked_at=NULL
      WHERE id=$1 AND provider='wechat_native' AND state='pending'
        AND price_minor=$5 AND currency=$6
        AND (notification_transaction_id IS NULL OR notification_transaction_id=$3)
      RETURNING id`,
    values:[n.orderId,n.eventId,n.transactionId,n.payloadSha256,n.amountMinor,n.currency],
  });
  if(r.rows[0]) return "recorded";
  // A genuine replay after settlement or refund must ACK, not trigger
  // endless retries, but only for the exact same trusted transaction.
  const x=await billingPool().query<{state:string;provider_transaction_id:string|null;
    price_minor:string;currency:string;provider:string}>({
    text:"SELECT state,provider_transaction_id,price_minor,currency,provider FROM billing_orders WHERE id=$1",
    values:[n.orderId],
  });
  const o=x.rows[0];
  if(o && ["paid","refunded"].includes(o.state) &&
      o.provider==="wechat_native" &&
      o.provider_transaction_id===n.transactionId &&
      Number(o.price_minor)===n.amountMinor && o.currency===n.currency)
    return "already_settled";
  throw new BillingConflictError("Native callback order not payable or conflicting");
}

function validateReceipt(r:VerifiedPaymentReceipt){
  identifier(r.eventId);identifier(r.orderId);identifier(r.transactionId);
  if(!["wechat_pay","wechat_native"].includes(r.provider) || r.signatureVerified!==true || r.providerStatusConfirmed!==true ||
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
      provider_transaction_id:string|null;state:string;
      tier:"plus"|"pro"|null;period:"month"|"year"|null;
      product_kind:"subscription"|"item";content_kind:"exam"|"resource"|"report"|null;content_id:string|null;
    }>("SELECT o.*,p.tier,p.period FROM billing_orders o JOIN billing_products p ON p.id=o.product_id WHERE o.id=$1 FOR UPDATE OF o",[r.orderId]);
    const o=result.rows[0];
    if(!o || o.provider!==r.provider || Number(o.price_minor)!==r.amountMinor || o.currency!==r.currency)
      throw new BillingConflictError("Provider order amount/currency mismatch");
    if(o.state==="paid"){
      if(o.provider_transaction_id!==r.transactionId)throw new BillingConflictError("Transaction already settled differently");
      const grantTable=o.product_kind==="item"?"billing_item_entitlements":"billing_entitlements";
      const e=await c.query<{id:string}>(`SELECT id FROM ${grantTable} WHERE source_order_id=$1`,[o.id]);
      if(!e.rows[0])throw new BillingConflictError("Paid order without grant");
      return {orderId:o.id,grantId:e.rows[0].id,tier:o.tier,created:false};
    }
    if(o.state!=="pending")throw new BillingConflictError("Order not payable");
    await c.query("INSERT INTO billing_payment_events(provider,event_id,order_id,event_kind,transaction_id,verified_at,payload_sha256) VALUES($1,$2,$3,'paid',$4,$5,$6)",
      [r.provider,r.eventId,o.id,r.transactionId,r.verifiedAt,r.payloadSha256]);
    await c.query("UPDATE billing_orders SET state='paid',paid_at=$2,provider_transaction_id=$3 WHERE id=$1",
      [o.id,r.verifiedAt,r.transactionId]);
    if(o.product_kind==="item"){
      // Snapshot on the order, not mutable SKU metadata, controls delivery.
      if(!o.content_kind || !o.content_id)
        throw new BillingConflictError("Item order missing immutable content target");
      const id="ent_"+crypto.randomBytes(12).toString("hex");
      await c.query("INSERT INTO billing_item_entitlements(id,payer_parent_id,source_order_id,content_kind,content_id,granted_at) VALUES($1,$2,$3,$4,$5,$6)",
        [id,o.payer_parent_id,o.id,o.content_kind,o.content_id,r.verifiedAt]);
      return {orderId:o.id,grantId:id,tier:null,created:true};
    }
    if(o.product_kind!=="subscription" || !o.tier || !o.period)
      throw new BillingConflictError("Invalid subscription order");
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
/** Exceptional OFFICIAL payment outcome only: never expose as a customer
 * self-service refund API. No normal order/payment flow calls this function.
 * Do not revoke an entitlement until an authorized, independently verified
 * final refund is recorded (e.g. mandatory legal/platform resolution).
 */
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
    await c.query("UPDATE billing_item_entitlements SET revoked_at=$2 WHERE source_order_id=$1 AND revoked_at IS NULL",[o.id,r.verifiedAt]);
    return {orderId:o.id,revoked:true};
  });
}
/** A server-verified, official CLOSED query (not an HTTP request timeout).
 * No client-supplied flag or browser cancellation can release the payable slot.
 */
export type VerifiedNativeCloseProof={
  orderId:string;
  payloadSha256:string;
  verifiedAt:Date;
  signatureVerified:true;
  providerClosedConfirmed:true;
};

export async function closeVerifiedNativeOrder(proof:VerifiedNativeCloseProof){
  identifier(proof.orderId);
  if(proof.signatureVerified!==true || proof.providerClosedConfirmed!==true ||
     !/^[a-f0-9]{64}$/.test(proof.payloadSha256) ||
     !Number.isFinite(proof.verifiedAt?.getTime()))
    throw new BillingConflictError("Unverified provider close evidence");
  return transaction(async c=>{
    const result=await c.query<{id:string;state:string;provider:string;
      close_provider_payload_sha256:string|null}>(`
      SELECT id,state,provider,close_provider_payload_sha256
      FROM billing_orders WHERE id=$1 FOR UPDATE`,[proof.orderId]);
    const o=result.rows[0];
    if(!o || o.provider!=="wechat_native")
      throw new BillingConflictError("Native order not found");
    if(o.state==="closed"){
      if(o.close_provider_payload_sha256!==proof.payloadSha256)
        throw new BillingConflictError("Conflicting official close proof");
      return {orderId:o.id,closed:false};
    }
    if(o.state!=="pending")
      throw new BillingConflictError("Paid/refunded order cannot be closed");
    await c.query(`UPDATE billing_orders
      SET state='closed',closed_at=$2,close_provider_payload_sha256=$3
      WHERE id=$1 AND state='pending'`,
      [o.id,proof.verifiedAt,proof.payloadSha256]);
    return {orderId:o.id,closed:true};
  });
}

export async function verifiedGrantsForParent(parentId:string,now=new Date()):Promise<AccessGrant[]>{
  const rows=await billingPool().query<{
    payer_parent_id:string;tier:"plus"|"pro";starts_at:Date;ends_at:Date;revoked_at:Date|null;
  }>("SELECT e.payer_parent_id,e.tier,e.starts_at,e.ends_at,e.revoked_at FROM billing_entitlements e JOIN billing_orders o ON o.id=e.source_order_id WHERE e.payer_parent_id=$1 AND o.state='paid' AND e.starts_at<=$2 AND e.ends_at>$2 AND (e.revoked_at IS NULL OR e.revoked_at>$2)",
    [parentId,now]);
  return rows.rows.map(e=>({ownerId:e.payer_parent_id,tier:e.tier,verified:true,startsAt:e.starts_at.getTime(),expiresAt:e.ends_at.getTime(),revokedAt:e.revoked_at?.getTime()}));
}
/** Item access is verified against the same settled orders, not a client-owned flag.
 * The caller must derive buyerId from an authenticated WeChat session.
 */
export async function hasVerifiedItemEntitlement(
  buyerId:string,contentKind:"exam"|"resource"|"report",contentId:string,
):Promise<boolean>{
  if(!/^par_[a-zA-Z0-9_]+$/.test(buyerId) ||
     !["exam","resource","report"].includes(contentKind) ||
     !contentId || contentId.length>200)
    throw new BillingConflictError("Invalid item entitlement lookup");
  const r=await billingPool().query<{owned:boolean}>(`
    SELECT EXISTS (
      SELECT 1 FROM billing_item_entitlements e
      JOIN billing_orders o ON o.id=e.source_order_id
      WHERE e.payer_parent_id=$1 AND e.content_kind=$2 AND e.content_id=$3
        AND o.state='paid' AND e.revoked_at IS NULL
    ) AS owned`,[buyerId,contentKind,contentId]);
  return r.rows[0]?.owned===true;
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
