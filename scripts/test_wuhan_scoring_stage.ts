import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {Pool} from "pg";
import {sealScoringStage,openScoringStage} from "../src/lib/wuhan-scoring-stage";
const owner="par_"+"a".repeat(16),other="par_"+"b".repeat(16),key=randomBytes(32);
async function main(){
 const url=process.env.WUHAN_STAGE_TEST_DB;
 if(!url||!/^postgres:\/\/[^/]+@127\.0\.0\.1:\d+\/wuhan_stage_ci$/.test(url))throw Error("isolated DB required");
 const pool=new Pool({connectionString:url});
 const q=async(s:string,args:unknown[]=[])=> (await pool.query(s,args)).rows;
 try{
  const [{v:t}]=await q("SELECT exam_access_draft.issue_research_ticket($1,1,'WH01',extract(epoch FROM clock_timestamp()+interval '1 hour')::bigint) AS v",[owner]);
  await q("SELECT exam_access_draft.claim_research_ticket($1,'WH01',$2,1)",[t.ticket,owner]);
  const input={attemptId:t.attempt_id,paper:"WH01",choices:[{task:"scene-museum-meeting",selected:1}],recordings:[{task:"answer-gift-budget",mime:"audio/wav",audio:Buffer.from("synthetic-fixture-only")}]};
  const stage=sealScoringStage(owner,input,key);
  assert.ok(!stage.ciphertext.includes(Buffer.from("synthetic-fixture-only")));
  assert.throws(()=>openScoringStage(other,input.attemptId,stage.manifest,stage.ciphertext,key));
  const changed=Buffer.from(stage.ciphertext);changed[13]^=1;
  assert.throws(()=>openScoringStage(owner,input.attemptId,stage.manifest,changed,key));
  const put=async(a:string)=> (await q("SELECT exam_access_draft.stage_research_scoring($1,$2,$3,$4,$5) AS v",[a,input.attemptId,input.paper,stage.manifest,stage.ciphertext]))[0].v;
  assert.equal(await put(owner),"consent_required");
  assert.equal((await q("SELECT exam_access_draft.grant_scoring_consent($1,$2,1) AS v",[other,input.attemptId]))[0].v,false);
  assert.equal((await q("SELECT exam_access_draft.grant_scoring_consent($1,$2,1) AS v",[owner,input.attemptId]))[0].v,true);
  assert.equal(await put(owner),"queued");
  assert.equal(await put(owner),"already_queued");
  assert.equal(await put(other),"consent_required");
  const [{v:job}]=await q("SELECT exam_access_draft.claim_research_scoring() AS v");
  assert.equal(job.manifest_sha256,stage.manifest);
  assert.equal((await q("SELECT * FROM exam_access_draft.load_research_scoring($1,$2)",[input.attemptId,"00000000-0000-0000-0000-000000000000"])).length,0);
  const [row]=await q("SELECT * FROM exam_access_draft.load_research_scoring($1,$2)",[input.attemptId,job.lease_id]);
  const s=openScoringStage(row.owner_id,input.attemptId,row.manifest_sha256,row.ciphertext,key);
  assert.equal(Buffer.from(s.recordings[0]!.audio).toString(),"synthetic-fixture-only");
  assert.equal((await q("SELECT exam_access_draft.revoke_scoring_consent($1,$2) AS v",[owner,input.attemptId]))[0].v,true);
  assert.equal((await q("SELECT * FROM exam_access_draft.load_research_scoring($1,$2)",[input.attemptId,job.lease_id])).length,0);
  assert.equal((await q("SELECT count(*)::int AS n FROM exam_access_draft.research_scoring_stage"))[0].n,0);
  assert.equal((await q("SELECT exam_access_draft.read_research_scoring($1,$2) AS v",[owner,input.attemptId]))[0].v.state,"failed");
  console.log("R92_STAGE_DB_PASS explicit scope; AEAD tamper rejection; actual manifest; atomic queue; lease; revocation and deletion");
 }finally{await pool.end()}
}
main().catch(e=>{console.error(e);process.exit(1)});
