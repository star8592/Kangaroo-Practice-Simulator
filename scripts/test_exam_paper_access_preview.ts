import assert from "node:assert/strict";
import {authenticateOrCreateWechatParent} from "../src/lib/parent-auth";
import {billingPool,closeBillingPoolForTests,createBillingOrder,settleVerifiedOrder,type VerifiedPaymentReceipt} from "../src/lib/billing-ledger";
import {DIGITAL_SALES_POLICY_VERSION} from "../src/lib/digital-sales-policy";
import {voucherPreviewEnabled} from "../src/lib/commerce/voucher-preview";
async function main(){
 assert(voucherPreviewEnabled());
 const db=billingPool();
 assert(process.env.SOCTHINK_USER_DATA_DIR?.startsWith("/tmp/soc-direct-exam-ci."));
 const a=authenticateOrCreateWechatParent({wechatId:"paper-basic",openId:"paper-basic"}).id;
 const b=authenticateOrCreateWechatParent({wechatId:"paper-standard",openId:"paper-standard"}).id;
 const stranger=authenticateOrCreateWechatParent({wechatId:"paper-stranger",openId:"paper-stranger"}).id;
 await db.query("INSERT INTO billing_products(id,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled,rights_approved,delivery_verified,access_restricted) VALUES('wh-ls-2027-entry','exam_access','exam_access','wuhan-2027','fixture entry',990,'CNY',true,true,true,true)");
 await db.query("INSERT INTO exam_access_draft.offer_terms VALUES('wh-ls-2027-entry',5,now()+interval '2 day','five_verified_papers')");
 await db.query("INSERT INTO exam_access_draft.paper_registry SELECT 'wuhan-2027','fixture-'||i,true,true FROM generate_series(1,6) i");
 await db.query("INSERT INTO exam_access_draft.basic_papers SELECT exam_key,paper_id FROM exam_access_draft.paper_registry WHERE paper_id IN ('fixture-1','fixture-2','fixture-3','fixture-4','fixture-5')");
 const consent={policyVersion:DIGITAL_SALES_POLICY_VERSION,acceptedAt:new Date()};
 const order=await createBillingOrder(a,"wh-ls-2027-entry","wechat_native",consent);
 const rec:VerifiedPaymentReceipt={provider:"wechat_native",orderId:order.id,eventId:"fixture-basic-pay",transactionId:"fixture-basic-txn",amountMinor:990,currency:"CNY",verifiedAt:new Date(),payloadSha256:"a".repeat(64),signatureVerified:true,providerStatusConfirmed:true};
 await settleVerifiedOrder(rec);
 await assert.rejects(()=>db.query("DELETE FROM exam_access_draft.basic_papers WHERE paper_id='fixture-1'"));
 await db.query("INSERT INTO voucher_draft.channel_mapping SELECT 'xiaohongshu','paper-shop','sku-standard',product_id,capacity,expires_at,true FROM exam_access_draft.offer_terms WHERE product_id='wh-ls-2027-standard'");
 await db.query("SELECT voucher_draft.issue_exam('xiaohongshu','paper-shop','line',0,'sku-standard','fixture-txn',3990,'CNY',repeat('c',64),repeat('d',64),now())");
 await db.query("SELECT voucher_draft.claim_exam(repeat('c',64),$1)",[b]);
 async function open(owner:string,id:string,exam="wuhan-2027"){return (await db.query("SELECT exam_access_draft.can_open_paper($1,$2,$3) AS ok",[owner,exam,id])).rows[0].ok;}
 assert(await open(a,"fixture-1"));assert(!await open(a,"fixture-6"));assert(await open(b,"fixture-6"));
 assert(!await open(b,"fixture-1","beijing-2027"));assert(!await open(stranger,"fixture-1"));
 await db.query("INSERT INTO exam_access_draft.paper_registry VALUES('wuhan-2027','fixture-7',true,true),('wuhan-2027','unverified',false,true)");
 assert(await open(b,"fixture-7"));assert(!await open(a,"fixture-7"));assert(!await open(b,"unverified"));
 async function debit(owner:string,paper:string,report:string){
  return (await db.query("SELECT exam_access_draft.consume_report($1,'wuhan-2027',$2,$3) AS r",[owner,paper,report])).rows[0].r;
 }
 assert.equal(await debit(a,"fixture-6","outside-basic"),"no_entitlement");
 assert.equal(await debit(a,"unverified","unverified-report"),"paper_unavailable");
 await db.query("SELECT voucher_draft.issue_exam('xiaohongshu','paper-shop','line-mixed',0,'sku-standard','fixture-mixed-txn',3990,'CNY',repeat('9',64),repeat('8',64),now())");
 await db.query("SELECT voucher_draft.claim_exam(repeat('9',64),$1)",[a]);
 assert.equal(await debit(a,"fixture-6","advanced"),"consumed");
 assert.equal(await debit(a,"fixture-6","advanced"),"already_consumed");
 assert.equal(await debit(a,"fixture-1","advanced"),"report_scope_conflict");
 assert.deepEqual((await Promise.all([debit(a,"fixture-1","basic"),debit(a,"fixture-1","basic")])).sort(),["already_consumed","consumed"]);
 const usage=(await db.query("SELECT t.paper_access,g.used FROM exam_access_draft.grants g JOIN exam_access_draft.order_terms t USING(source_order_id) WHERE g.owner_id=$1 ORDER BY t.paper_access",[a])).rows;
 assert.deepEqual(usage.map(x=>[x.paper_access,x.used]),[["all_verified_papers_and_updates",1],["five_verified_papers",1]]);
 await db.query("SELECT voucher_draft.refund_exam('xiaohongshu','paper-shop','line-mixed',0,repeat('7',64),now())");
 assert.equal(await debit(a,"fixture-7","refunded-advanced"),"no_entitlement");
 console.log("PAPER_SCOPED_DEBIT=PASS");
 // Synthetic trusted-service receipts. Never expose receipt insertion to
 // the browser, never treat R68 research decisions as verified scores.
 async function verifiedDebit(owner:string,paper:string,report:string){
  return (await db.query("SELECT exam_access_draft.consume_verified_report($1,'wuhan-2027',$2,$3) AS r",[owner,paper,report])).rows[0].r;
 }
 async function receipt(id:string,status:string,owner=a,valid=1,count=18){
  await db.query("INSERT INTO exam_access_draft.verified_report_receipts VALUES($1,$2,'wuhan-2027','fixture-1',$3,repeat('b',64),$4,18,$5,$6,now())",[id,owner,'attempt-'+id,status,count,valid]);
 }
 assert.equal(await verifiedDebit(a,"fixture-1","nonexistent"),"no_verified_report");
 await receipt("research-only","research");assert.equal(await verifiedDebit(a,"fixture-1","research-only"),"report_not_billable");
 await receipt("failed-score","failed",a,0,17);assert.equal(await verifiedDebit(a,"fixture-1","failed-score"),"report_not_billable");
 await assert.rejects(()=>receipt("fake-blank-verified","verified",a,0,18));
 await assert.rejects(()=>receipt("fake-incomplete-verified","verified",a,1,17));
 await receipt("trusted-fixture","verified");
 assert.equal(await verifiedDebit(stranger,"fixture-1","trusted-fixture"),"report_scope_conflict");
 assert.equal(await verifiedDebit(a,"fixture-2","trusted-fixture"),"report_scope_conflict");
 assert.deepEqual((await Promise.all([verifiedDebit(a,"fixture-1","trusted-fixture"),verifiedDebit(a,"fixture-1","trusted-fixture")])).sort(),["already_consumed","consumed"]);
 assert.equal(await verifiedDebit(a,"fixture-1","trusted-fixture"),"already_consumed");
 await assert.rejects(()=>db.query("INSERT INTO exam_access_draft.verified_report_receipts SELECT 'new-id',owner_id,exam_key,paper_id,attempt_id,evidence_sha256,status,expected_tasks,accounted_tasks,valid_oral_results,finalized_at FROM exam_access_draft.verified_report_receipts WHERE report_id='trusted-fixture'"));
 // Role grants only in this disposable database. No client-facing writer.
 await db.query("CREATE ROLE fixture_report_writer NOLOGIN; CREATE ROLE fixture_report_consumer NOLOGIN; GRANT USAGE ON SCHEMA exam_access_draft TO fixture_report_writer,fixture_report_consumer; GRANT INSERT ON exam_access_draft.verified_report_receipts TO fixture_report_writer; GRANT EXECUTE ON FUNCTION exam_access_draft.consume_verified_report(text,text,text,text) TO fixture_report_consumer");
 const isolated=await db.connect();
 try{
  await isolated.query("SET ROLE fixture_report_consumer");
  await assert.rejects(()=>isolated.query("SELECT * FROM exam_access_draft.verified_report_receipts"),/permission denied/);
  await assert.rejects(()=>isolated.query("SELECT exam_access_draft.consume_report($1,'wuhan-2027','fixture-1','bypass')",[a]),/permission denied/);
  await assert.rejects(()=>isolated.query("INSERT INTO exam_access_draft.verified_report_receipts VALUES('forged',$1,'wuhan-2027','fixture-1','forged',repeat('a',64),'verified',18,18,1,now())",[a]),/permission denied/);
  assert.equal((await isolated.query("SELECT exam_access_draft.consume_verified_report($1,'wuhan-2027','fixture-1','trusted-fixture') AS r",[a])).rows[0].r,"already_consumed");
  await isolated.query("RESET ROLE; SET ROLE fixture_report_writer");
  await isolated.query("INSERT INTO exam_access_draft.verified_report_receipts VALUES('writer-fixture',$1,'wuhan-2027','fixture-1','writer-attempt',repeat('a',64),'research',18,18,1,now())",[a]);
  await assert.rejects(()=>isolated.query("UPDATE exam_access_draft.verified_report_receipts SET status='verified'"),/permission denied/);
  await assert.rejects(()=>isolated.query("SELECT exam_access_draft.consume_verified_report($1,'wuhan-2027','fixture-1','trusted-fixture')",[a]),/permission denied/);
 }finally{await isolated.query("RESET ROLE");isolated.release();}
 console.log("VERIFIED_REPORT_ROLE_ISOLATION=PASS");
 console.log("VERIFIED_REPORT_DEBIT_CONTRACT=PASS");
 await db.query("SELECT voucher_draft.refund_exam('xiaohongshu','paper-shop','line',0,repeat('e',64),now())");
 assert(!await open(b,"fixture-6"));
 const active=await db.query("SELECT count(*)::int n FROM exam_access_draft.active_grants WHERE owner_id=$1",[b]);
 assert.equal(active.rows[0].n,0);
 console.log("EXAM_PAPER_ACCESS_PG18=PASS");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(closeBillingPoolForTests);
