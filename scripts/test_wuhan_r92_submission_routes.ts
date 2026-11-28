import assert from "node:assert/strict";
import {NextRequest} from "next/server";
import {createParentSessionToken} from "../src/lib/parent-auth";
import {POST as createAttempt} from "../src/app/api/platform/research/wuhan/attempts/route";
import {POST as submit,DELETE as revoke} from "../src/app/api/platform/research/wuhan/submissions/[id]/route";
import {billingPool,closeBillingPoolForTests} from "../src/lib/billing-ledger";
async function main(){
 const owner="par_"+"c".repeat(16),other="par_"+"d".repeat(16);
 const token=createParentSessionToken(owner,3600),otherToken=createParentSessionToken(other,3600);
 const path="/api/platform/research/wuhan";
 const req=(suffix:string,body:unknown,session=token,origin="http://localhost:3000",method="POST")=>new NextRequest("http://localhost:3000"+path+suffix,{method,headers:{Origin:origin,Host:"localhost:3000","Sec-Fetch-Site":"same-origin",Cookie:session?"socthink_parent_session="+session:"","Content-Type":"application/json"},...(method==="DELETE"?{}:{body:JSON.stringify(body)})});
 try{
  assert.equal((await createAttempt(req("/attempts",{paper:"WH01"},""))).status,401);
  assert.equal((await createAttempt(req("/attempts",{paper:"WH01"},token,"https://other.invalid"))).status,403);
  const created=await createAttempt(req("/attempts",{paper:"WH01"}));assert.equal(created.status,201);
  const c=await created.json(),id=c.attempt_id,params={params:Promise.resolve({id})},suffix="/submissions/"+id;
  const input={paper:"WH01",noticeVersion:"wuhan-recording-v1",guardianConfirmed:true,choices:[{task:"scene-museum-meeting",selected:1}],recordings:[{task:"answer-gift-budget",mime:"audio/wav",audioBase64:"YWJj"}]};
  assert.equal((await submit(req(suffix,input,otherToken),params)).status,404);
  assert.equal((await submit(req(suffix,{...input,guardianConfirmed:false}),params)).status,400);
  assert.equal((await submit(req(suffix,{...input,score:100}),params)).status,400);
  assert.equal((await submit(req(suffix,input,token,"https://other.invalid"),params)).status,403);
  const accepted=await submit(req(suffix,input),params);assert.equal(accepted.status,202);assert.equal((await accepted.json()).report_url,"/account/research/wuhan/"+id);
  assert.equal((await submit(req(suffix,input),params)).status,202);
  assert.equal((await submit(req(suffix,{...input,recordings:[{...input.recordings[0],audioBase64:"YWJk"}]}),params)).status,409);
  assert.equal((await revoke(req(suffix,null,otherToken,undefined,"DELETE"),params)).status,404);
  assert.equal((await revoke(req(suffix,null,token,undefined,"DELETE"),params)).status,200);
  assert.equal((await billingPool().query("SELECT count(*)::int AS n FROM exam_access_draft.research_scoring_stage WHERE attempt_id=$1",[id])).rows[0].n,0);
  console.log("R92_NEXT_ROUTE_HANDLER_PASS identity; origin; explicit scope; immutable retry; revocation");
 }finally{await closeBillingPoolForTests()}
}
main().catch(e=>{console.error(e);process.exit(1)});
