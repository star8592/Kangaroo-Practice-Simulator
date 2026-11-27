import assert from "node:assert/strict";
import {NextRequest} from "next/server";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "../src/lib/parent-auth";
import {bindSiteOwner} from "../src/lib/site-owner";
import {billingPool,closeBillingPoolForTests} from "../src/lib/billing-ledger";
import {voucherPreviewEnabled} from "../src/lib/commerce/voucher-preview";
import {GET} from "../src/app/api/platform/admin/commerce/route";
async function main(){
 assert(voucherPreviewEnabled());
 assert(process.env.SOCTHINK_USER_DATA_DIR?.startsWith("/tmp/soc-direct-exam-ci."));
 const db=billingPool();
 const a=authenticateOrCreateWechatParent({wechatId:"admin-fixture",openId:"admin-fixture"});
 const b=authenticateOrCreateWechatParent({wechatId:"ordinary-fixture",openId:"ordinary-fixture"});
 bindSiteOwner({parent:a,email:"fixture@example.test",adminId:"test-only"});
 function request(uid?:string,query=""){
  return new NextRequest("http://localhost:3000/api/platform/admin/commerce"+query,{headers:uid?{cookie:PARENT_SESSION_COOKIE+"="+createParentSessionToken(uid)}:{}});
 }
 assert.equal((await GET(request())).status,401);
 assert.equal((await GET(request(b.id))).status,403);
 await db.query("SELECT voucher_draft.issue_exam('xiaohongshu','paper-shop','unclaimed-admin-fixture',0,'sku-standard','admin-test-txn',3990,'CNY',repeat('1',64),repeat('2',64),now())");
 const response=await GET(request(a.id));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.counts.unclaimed,1);
 assert.equal(data.counts.unclaimed_paid_minor,"3990");
 assert(data.counts.refunded>=2);
 assert(!JSON.stringify(data).includes("code_digest"));
 assert(!JSON.stringify(data).includes("verified_receipt_digest"));
 const filtered=await (await GET(request(a.id,"?state=unclaimed&q=unclaimed-admin-fixture"))).json();
 assert.equal(filtered.rows.length,1);assert.equal(filtered.rows[0].central_order_id,null);
 assert.equal(filtered.rows[0].status,"unclaimed");
 assert.equal((await (await GET(request(a.id,"?q=nonexistent"))).json()).rows.length,0);
 await db.query("SELECT voucher_draft.claim_exam(repeat('1',64),$1)",[b.id]);
 const after=await (await GET(request(a.id))).json();
 assert.equal(after.counts.unclaimed,0);assert.equal(after.counts.unclaimed_paid_minor,"0");
 assert.equal(after.counts.activated,1);
 process.env.SOCTHINK_VOUCHER_PREVIEW="0";
 assert.equal((await GET(request(a.id))).status,404);
 console.log("ADMIN_VOUCHER_OVERVIEW_PG18=PASS");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(closeBillingPoolForTests);
