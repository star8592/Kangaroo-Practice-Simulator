import assert from "node:assert/strict";
import {createServer} from "node:http";
import {prepareScoringSubmission,buildScoringReport} from "../src/lib/wuhan-scoring-job";
async function main(){
 const id="a".repeat(32),revision="b".repeat(64);
 const submission={attemptId:id,paper:"WH01",choices:[{task:"scene-museum-meeting",selected:1}],recordings:[{task:"answer-gift-budget",mime:"audio/wav",audio:Buffer.from("fixture")} ]};
 const manifest=prepareScoringSubmission(submission).manifestSha256;
 assert.equal(prepareScoringSubmission({...submission,recordings:[...submission.recordings]}).manifestSha256,manifest);
 assert.notEqual(prepareScoringSubmission({...submission,recordings:[{...submission.recordings[0]!,audio:Buffer.from("changed")}]}).manifestSha256,manifest);
 assert.throws(()=>prepareScoringSubmission({...submission,choices:[...submission.choices,...submission.choices]}));
 assert.throws(()=>prepareScoringSubmission({...submission,recordings:[{...submission.recordings[0]!,task:"scene-museum-meeting"}]}));
 let calls=0;
 const server=createServer(async(req,res)=>{
  calls++;const chunks=[];for await(const b of req)chunks.push(b);
  const rows=JSON.parse(Buffer.concat(chunks).toString());
  const results=rows.map((r:{paper:string;task:string;attempt:string})=>({scope:{attempt_id:r.attempt,paper_id:r.paper,task_id:r.task,audio_sha256:"c".repeat(64)},status:"reference_match",official_score:false,human_review_required:true,reference_content_score:null,machine_rule_revision:revision,practice_content:{earned:1,possible:1,basis:"automatic_content_match"}}));
  res.setHeader("Cache-Control","no-store");res.end(JSON.stringify({scope:"practice_batch_candidate_only",billable:false,official_score:false,request_nonce:req.headers["x-wuhan-nonce"],machine_rule_revision:revision,results}));
 });
 await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));
 try{
  const addr=server.address();assert.ok(addr&&typeof addr!=="string");
  const settings={origin:"http://127.0.0.1:"+addr.port,key:Buffer.alloc(32,1),revision};
  await assert.rejects(buildScoringReport(submission,"f".repeat(64),settings,async()=>true));
  await assert.rejects(buildScoringReport(submission,manifest,settings,async()=>false));
  assert.equal(calls,0);
  const report=await buildScoringReport(submission,manifest,settings,async()=>true);
  assert.equal(report.items.length,18);assert.equal(report.submitted,2);assert.equal(report.choice_correct,1);assert.equal(report.total_score,null);
  const oral=report.items.find(x=>x.task_id==="answer-gift-budget")!;
  assert.equal(oral.state,"reference_match");assert.equal((oral.candidate as any).scope.attempt_id,id);
  let n=0;await assert.rejects(buildScoringReport(submission,manifest,settings,async()=>++n<3));
  assert.equal(calls,2);
  console.log("R91_JOB_MANIFEST_REPORT_PASS digest changes; authorization; 18 items; scope binding; no fabricated total");
 }finally{server.close()}
}
main().catch(e=>{console.error(e);process.exit(1)});
