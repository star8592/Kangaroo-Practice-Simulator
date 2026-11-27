// Test-only: fresh isolated unix-socket database, synthetic paid receipts,
// random in-memory keys, no live codes, no external platform transactions.
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {deriveVoucherCode,voucherLookupDigest} from "../src/lib/commerce/voucher-contract.mjs";
const socket=process.env.SOC_VOUCHER_TEST_SOCKET;
assert(socket?.startsWith("/tmp/soc-channel-bridge-ci."));
assert(process.env.SOC_VOUCHER_TEST_ISOLATED==="1");
function q(sql){return execFileSync(process.env.SOC_VOUCHER_TEST_PSQL,["-X","-qAt","-v","ON_ERROR_STOP=1","-h",socket,"-p","55483","-d","postgres","-c",sql],{encoding:"utf8"}).trim();}
q("INSERT INTO billing_products(id,product_kind,content_kind,content_id,title_zh,amount_minor,currency,enabled,rights_approved,delivery_verified,access_restricted) VALUES ('wh-xianyu-entry-fixture','exam_access','exam_access','wuhan-2027','fixture',990,'CNY',true,true,true,true); INSERT INTO exam_access_draft.offer_terms VALUES('wh-xianyu-entry-fixture',5,now()+interval '2 days','five_verified_papers'); INSERT INTO exam_access_draft.paper_registry SELECT 'wuhan-2027','xy-paper-'||i,true,true FROM generate_series(1,5) i; INSERT INTO exam_access_draft.basic_papers SELECT exam_key,paper_id FROM exam_access_draft.paper_registry WHERE paper_id LIKE 'xy-paper-%';");
q("INSERT INTO voucher_draft.channel_mapping SELECT 'xianyu','xy-test','xy-entry',product_id,capacity,expires_at,true FROM exam_access_draft.offer_terms WHERE product_id='wh-xianyu-entry-fixture'; INSERT INTO voucher_draft.channel_mapping SELECT 'xianyu','xy-test','xy-standard',product_id,capacity,expires_at,true FROM exam_access_draft.offer_terms WHERE product_id='wh-standard';");
const issueKey=randomBytes(32), lookupKey=randomBytes(32), digests=new Set(), codes=new Set();
for(const [sku,amount,capacity] of [["xy-entry",990,5],["xy-standard",3990,30]]){
 for(let i=0;i<10;i++){
  const line="fixture-"+sku+"-"+i;
  const unit={channel:"xianyu",merchantId:"xy-test",orderLineId:line,unitIndex:0};
  const code=deriveVoucherCode(unit,issueKey), digest=voucherLookupDigest(code,lookupKey);
  assert(!codes.has(code)&&!digests.has(digest));codes.add(code);digests.add(digest);
  const issue="SELECT voucher_draft.issue_exam('xianyu','xy-test','"+line+"',0,'"+sku+"','fixture-tx-"+line+"',"+amount+",'CNY','"+digest+"',repeat('e',64),now())";
  assert.equal(q(issue),"issued");assert.equal(q(issue),"already_issued");
  const owner="par_xy_"+sku.replace("-","_")+"_"+i;
  assert.equal(q("SELECT voucher_draft.claim_exam('"+digest+"','"+owner+"')"),"claimed");
  assert.equal(q("SELECT voucher_draft.claim_exam('"+digest+"','"+owner+"')"),"already_claimed");
  assert.equal(q("SELECT voucher_draft.claim_exam('"+digest+"','par_wrong')"),"unavailable");
  assert.equal(q("SELECT capacity FROM exam_access_draft.active_grants WHERE owner_id='"+owner+"'"),String(capacity));
  assert.equal(q("SELECT exam_access_draft.can_open_paper('"+owner+"','wuhan-2027','xy-paper-1')"),"t");
  if(i===0){
   assert.equal(q("SELECT voucher_draft.refund_exam('xianyu','xy-test','"+line+"',0,repeat('c',64),now())"),"revoked");
   assert.equal(q("SELECT count(*) FROM exam_access_draft.active_grants WHERE owner_id='"+owner+"'"),"0");
   assert.equal(q(issue),"refunded");
  }
 }
}
assert.equal(codes.size,20);assert.equal(digests.size,20);
assert.equal(q("SELECT count(*) FROM billing_orders WHERE provider='xianyu'"),"20");
assert.equal(q("SELECT count(*) FROM billing_orders WHERE provider='xianyu' AND state='paid'"),"18");
console.log("XIANYU_VOUCHER_BATCH=PASS 10 basic + 10 standard (synthetic orders, no live issuance)");
