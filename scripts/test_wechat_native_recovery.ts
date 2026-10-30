import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  reconcileOneNativeOrder,
  type PendingNativeOrder,
} from "../src/lib/wechat-native-reconciliation-core";
import type { VerifiedPaymentReceipt } from "../src/lib/billing-ledger";

async function run() {
  const order: PendingNativeOrder = {
    id: "ord_1234567890abcdef12345678",
    amountMinor: 1900,
    currency: "CNY",
  };
  const hash = createHash("sha256").update("synthetic-signed-provider-response").digest("hex");
  let settled: VerifiedPaymentReceipt[] = [];
  const now = () => new Date("2026-10-30T12:34:00Z");
  const paid = {
    status: "VERIFIED_PAID" as const,
    transactionId: "wx_syn_123456789",
    verifiedBodySha256: hash,
  };
  const deps = {
    query: async () => paid,
    settle: async (receipt: VerifiedPaymentReceipt) => {settled.push(receipt);},
    now,
  };
  assert.equal(await reconcileOneNativeOrder(order, deps), "SETTLED");
  assert.equal(settled.length, 1);
  assert.deepEqual(settled[0], {
    provider: "wechat_native",
    eventId: "native-query-wx_syn_123456789",
    orderId: order.id,
    transactionId: paid.transactionId,
    amountMinor: 1900,
    currency: "CNY",
    payloadSha256: hash,
    verifiedAt: now(),
    signatureVerified: true,
    providerStatusConfirmed: true,
  });
  // A retry does not generate a different event id. The PostgreSQL
  // settlement implementation already guards duplicates via row locks.
  assert.equal(await reconcileOneNativeOrder(order,deps),"SETTLED");
  assert.equal(settled[0].eventId,settled[1].eventId);
  settled = [];
  const notPaid = { ...deps, query: async () => ({ status: "NOT_PAID" as const }) };
  assert.equal(await reconcileOneNativeOrder(order,notPaid),"NOT_PAID");
  assert.equal(settled.length,0);
  for (const invalid of [
    { ...paid, transactionId: undefined },
    { ...paid, verifiedBodySha256: undefined },
    { ...paid, verifiedBodySha256: "hash-is-not-sha256" },
  ]) {
    await assert.rejects(()=>reconcileOneNativeOrder(order,{
      ...deps,query:async()=>invalid,
    }), /UNVERIFIED_PROVIDER_RESULT/);
    assert.equal(settled.length,0);
  }
  await assert.rejects(()=>reconcileOneNativeOrder({...order,amountMinor:0},deps),
    /INVALID_LOCAL_ORDER_SNAPSHOT/);
  await assert.rejects(()=>reconcileOneNativeOrder({...order,id:"../../wrong"},deps),
    /INVALID_LOCAL_ORDER_SNAPSHOT/);
  await assert.rejects(()=>reconcileOneNativeOrder(order,{
    ...deps,query:async()=>{throw Error("OFFICIAL_NETWORK_UNAVAILABLE");},
  }), /OFFICIAL_NETWORK_UNAVAILABLE/);
  console.log("WECHAT_NATIVE_RECOVERY=PASS (signed query receipt, deterministic idempotency, negative states)");
}
run().catch(e=>{console.error("WECHAT_NATIVE_RECOVERY_TEST_FAILED",e);process.exitCode=1});
