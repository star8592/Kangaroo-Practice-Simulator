import assert from "node:assert/strict";
import {createHmac,randomBytes} from "node:crypto";
import {NextRequest} from "next/server";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "../src/lib/parent-auth";
import {billingPool,closeBillingPoolForTests} from "../src/lib/billing-ledger";
import {voucherPreviewEnabled} from "../src/lib/commerce/voucher-preview";
import {POST} from "../src/app/api/platform/billing/redeem/route";
async function main(){
 assert(voucherPreviewEnabled());
 assert(process.env.SOCTHINK_USER_DATA_DIR?.startsWith("/tmp/soc-direct-exam-ci."));
 const db=billingPool();
 const a=authenticateOrCreateWechatParent({wechatId:"fixture-a",openId:"fixture-a"});
 const b=authenticateOrCreateWechatParent({wechatId:"fixture-b",openId:"fixture-b"});
 const code="SOC-1-"+randomBytes(24).toString("base64url");
 const digest=createHmac("sha256",Buffer.from(process.env.SOCTHINK_VOUCHER_PREVIEW_LOOKUP_KEY!,"hex")).update("soc-voucher-lookup\0"+code).digest("hex");
 await db.query("INSERT INTO voucher_draft.channel_mapping VALUES('xiaohongshu','fixture-shop','fixture-external','wh-ls-2027-standard',30,now()+interval '2 days',true)");
 assert.equal((await db.query("SELECT voucher_draft.issue_exam('xiaohongshu','fixture-shop','fixture-line',0,'fixture-external','fixture-external-txn',3990,'CNY',$1,repeat('a',64),now()) AS r",[digest])).rows[0].r,"issued");
 function request(owner?:string,body:unknown={code},origin="http://localhost:3000"){
  const headers:Record<string,string>={origin,"content-type":"application/json"};
  if(owner)headers.cookie=PARENT_SESSION_COOKIE+"="+createParentSessionToken(owner);
  return new NextRequest("http://localhost:3000/api/platform/billing/redeem",{method:"POST",headers,body:JSON.stringify(body)});
 }
 assert.equal((await POST(request())).status,401);
 assert.equal((await POST(request(a.id,{code},"https://invalid.example"))).status,403);
 assert.equal((await POST(request(a.id,{code:"bad"}))).status,400);
 const results=await Promise.all([POST(request(a.id)),POST(request(b.id))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const owner=results[0].status===200?a:b;
 assert.equal((await POST(request(owner.id))).status,200);
 const grants=await db.query("SELECT owner_id,capacity FROM exam_access_draft.active_grants");
 assert.deepEqual(grants.rows,[{owner_id:owner.id,capacity:30}]);
 await db.query("SELECT voucher_draft.refund_exam('xiaohongshu','fixture-shop','fixture-line',0,repeat('b',64),now())");
 assert.equal((await POST(request(owner.id))).status,409);
 assert.equal((await db.query("SELECT count(*)::int n FROM exam_access_draft.active_grants")).rows[0].n,0);
 process.env.SOCTHINK_VOUCHER_PREVIEW="0";
 assert.equal((await POST(request(owner.id))).status,404);
 console.log("VOUCHER_REDEEM_ROUTE_PG18=PASS (NextRequest direct route invocation; synthetic WeChat accounts)");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(closeBillingPoolForTests);
