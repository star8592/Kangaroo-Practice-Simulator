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
 await db.query("SELECT voucher_draft.refund_exam('xiaohongshu','paper-shop','line',0,repeat('e',64),now())");
 assert(!await open(b,"fixture-6"));
 const active=await db.query("SELECT count(*)::int n FROM exam_access_draft.active_grants WHERE owner_id=$1",[b]);
 assert.equal(active.rows[0].n,0);
 console.log("EXAM_PAPER_ACCESS_PG18=PASS");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(closeBillingPoolForTests);
