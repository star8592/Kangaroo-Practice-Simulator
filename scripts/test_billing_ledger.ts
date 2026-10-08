import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { billingPool,closeBillingPoolForTests,createBillingOrder,
  settleVerifiedOrder,refundVerifiedOrder,consumeUsage,verifiedGrantsForParent,
  verifiedParentsForStudent,linkVerifiedFamilyMember,BillingConflictError,
  BillingQuotaExceededError,type VerifiedPaymentReceipt } from "../src/lib/billing-ledger";

const testUrl = new URL(process.env.SOCTHINK_BILLING_DATABASE_URL || "postgres://invalid/invalid");
if (!process.env.SOCTHINK_BILLING_DATABASE_URL ||
    process.env.SOCTHINK_BILLING_TEST_ISOLATED !== "1" ||
    !["127.0.0.1", "localhost"].includes(testUrl.hostname) ||
    !testUrl.pathname.endsWith("_ci")) {
  throw new Error("Refusing to run outside localhost isolated *_ci billing test database");
}

const db=billingPool();
function receipt(orderId:string, eventId:string, transactionId:string, amountMinor=3900):VerifiedPaymentReceipt {
  return {provider:"wechat_pay",orderId,eventId,transactionId,amountMinor,
    currency:"CNY",payloadSha256:crypto.createHash("sha256").update(eventId).digest("hex"),
    verifiedAt:new Date(),signatureVerified:true,providerStatusConfirmed:true};
}
async function run() {
  await db.query(fs.readFileSync("ops/db/001_billing_entitlements.sql","utf8"));
  // The caller uses a throwaway database; no production fixture or customer data.
  await db.query("TRUNCATE billing_usage_events,billing_usage_buckets,billing_family_links,billing_entitlements,billing_payment_events,billing_orders,billing_products RESTART IDENTITY CASCADE");
  await db.query("INSERT INTO billing_products(id,tier,period,amount_minor,currency,enabled) VALUES('plus_month','plus','month',3900,'CNY',true)");
  const one=await createBillingOrder("par_test01","plus_month");
  assert.equal(one.priceMinor,3900);
  await assert.rejects(()=>settleVerifiedOrder(receipt(one.id,"bad-amount","wx-01",1)),BillingConflictError);
  assert.equal((await db.query("SELECT state FROM billing_orders WHERE id=$1",[one.id])).rows[0].state,"pending");
  const paid=await settleVerifiedOrder(receipt(one.id,"paid-01","wx-01"));
  assert.equal(paid.created,true);
  assert.equal((await settleVerifiedOrder(receipt(one.id,"paid-01","wx-01"))).created,false);
  assert.equal((await verifiedGrantsForParent("par_test01")).length,1);

  const two=await createBillingOrder("par_test01","plus_month");
  const renewal=await settleVerifiedOrder(receipt(two.id,"paid-02","wx-02"));
  assert.equal(renewal.created,true);
  const terms=await db.query("SELECT starts_at,ends_at FROM billing_entitlements WHERE payer_parent_id='par_test01' ORDER BY starts_at");
  assert.equal(terms.rows.length,2);
  assert.ok(new Date(terms.rows[1].starts_at).getTime()>=new Date(terms.rows[0].ends_at).getTime());
  assert.equal((await verifiedGrantsForParent("par_attacker")).length,0);

  await linkVerifiedFamilyMember("par_test01","stu_test01",new Date());
  assert.deepEqual(await verifiedParentsForStudent("stu_test01"),["par_test01"]);
  assert.deepEqual(await verifiedParentsForStudent("stu_stranger"),[]);

  // Concurrent reservations must not overdraw the bucket.
  const day=new Date("2026-10-08T00:00:00Z");
  const end=new Date("2026-10-09T00:00:00Z");
  const quota={parentId:"par_test01",capability:"solution_ai",periodStart:day,periodEnd:end,capacity:2,units:1};
  const attempts=await Promise.allSettled(Array.from({length:4},(_,i)=>
    consumeUsage({...quota,idempotencyKey:"req-"+i,actionId:"job-"+i})));
  assert.equal(attempts.filter(x=>x.status==="fulfilled").length,2);
  assert.equal(attempts.filter(x=>x.status==="rejected" && x.reason instanceof BillingQuotaExceededError).length,2);
  const bucket=(await db.query("SELECT used,capacity FROM billing_usage_buckets WHERE payer_parent_id='par_test01'")).rows[0];
  assert.deepEqual(bucket,{used:2,capacity:2});
  const duplicate=await consumeUsage({...quota,idempotencyKey:"req-0",actionId:"job-0"});
  assert.equal(duplicate.duplicated,true);
  await assert.rejects(()=>consumeUsage({...quota,idempotencyKey:"req-0",actionId:"different"}),BillingConflictError);

  // Simultaneous replays of one idempotency key only consume one unit.
  const sameKey={...quota,capability:"quota_replay",capacity:1,idempotencyKey:"replay-key",actionId:"same-job"};
  const replays=await Promise.all([
    consumeUsage(sameKey),
    consumeUsage(sameKey),
  ]);
  assert.equal(replays.filter(x=>!x.duplicated).length,1);
  assert.equal(replays.filter(x=>x.duplicated).length,1);
  assert.equal((await db.query("SELECT used FROM billing_usage_buckets WHERE capability='quota_replay'")).rows[0].used,1);

  // Refund ends entitlement without deleting historical learning data.
  const refunded=await refundVerifiedOrder(receipt(one.id,"refund-01","wx-01"));
  assert.equal(refunded.revoked,true);
  assert.equal((await refundVerifiedOrder(receipt(one.id,"refund-01","wx-01"))).revoked,false);
  assert.equal((await verifiedGrantsForParent("par_test01")).length,0); // renewal starts after first term
  await refundVerifiedOrder(receipt(two.id,"refund-02","wx-02"));
  assert.equal((await db.query("SELECT count(*)::int AS count FROM billing_entitlements WHERE revoked_at IS NOT NULL")).rows[0].count,2);
  await assert.rejects(()=>settleVerifiedOrder(receipt(one.id,"paid-new","wx-01")),BillingConflictError);
  console.log("BILLING_LEDGER_PASS order-payment, renewal, refund, owner isolation, 4-way quota concurrency, idempotency");
}
run().then(()=>closeBillingPoolForTests()).catch(async e=>{
  console.error("BILLING_LEDGER_FAIL",e);await closeBillingPoolForTests();process.exitCode=1;
});
