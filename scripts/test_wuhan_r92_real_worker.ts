import assert from "node:assert/strict";
import {spawn,execFileSync} from "node:child_process";
import {createHash,randomBytes} from "node:crypto";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {Pool} from "pg";
import {activeParentSessionVersion,createParentSessionToken} from "../src/lib/parent-auth";
import {sealScoringStage} from "../src/lib/wuhan-scoring-stage";
import {runScoringWorkerOnce} from "../src/lib/wuhan-scoring-worker";
import contract from "../backend/socthink-core/src/wuhan-research-report-contract.json";
async function main(){
 const root=process.env.WUHAN_ACCENT_RESEARCH_ROOT;
 const url=process.env.WUHAN_STAGE_TEST_DB,archiveOrigin=process.env.WUHAN_STAGE_ARCHIVE_ORIGIN;
 if(!root||!path.isAbsolute(root)||!url||!url.endsWith("/wuhan_stage_ci")||!archiveOrigin?.startsWith("http://127.0.0.1:"))throw Error("isolated fixture only");
 const pool=new Pool({connectionString:url}),q=async(s:string,args:unknown[]=[]) => (await pool.query(s,args)).rows;
 const owner="par_"+"c".repeat(16),key=randomBytes(32),stageKey=randomBytes(32);
 const h=createHash("sha256");
 for(const f of ["src/wuhan_oral_grade.rs","scripts/evidence_lab/wuhan_oral_audio_worker.py","content/wuhan-2027/machine-semantic-r78.json","content/wuhan-2027/oral-rubric-v1.json"]){const b=readFileSync(path.join(root,f)),n=Buffer.alloc(8);n.writeBigUInt64BE(BigInt(b.length));h.update(n).update(b)}
 const revision=h.digest("hex"),dir=mkdtempSync(path.join(tmpdir(),"wh-r92-")),keyfile=path.join(dir,"key");
 writeFileSync(keyfile,key.toString("hex"),{mode:0o600,flag:"wx"});
 const p=spawn(path.join(root,"target/debug/examples/wuhan-private-practice-rpc"),[],{cwd:root,env:{...process.env,WUHAN_PRIVATE_PRACTICE_ENABLED:"1",WUHAN_PRIVATE_PRACTICE_KEY_FILE:keyfile},stdio:["ignore","pipe","ignore"]});
 try{
  const origin=await new Promise<string>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("RPC did not start")),10000);p.once("error",reject);p.once("exit",()=>reject(Error("RPC exited")));let output="";p.stdout.on("data",b=>{output+=String(b);const m=/WUHAN_PRIVATE_LISTEN=(http:\/\/127\.0\.0\.1:\d+)/.exec(output);if(m){clearTimeout(timer);resolve(m[1]!)}})});
  const [{v:t}]=await q("SELECT exam_access_draft.issue_research_ticket($1,1,'WH01',extract(epoch FROM clock_timestamp()+interval '1 hour')::bigint) AS v",[owner]);
  await q("SELECT exam_access_draft.claim_research_ticket($1,'WH01',$2,1)",[t.ticket,owner]);
  const tasks=contract.papers[0]!.tasks;
  const phrases:Record<string,string>={"answer-gift-budget":"Eighteen pounds.","answer-poster-deadline":"By Friday afternoon.","read-trees":"Trees also slow rainwater as it reaches the ground.","retell-river-cleanup":"They planted twenty young trees. They picked up rubbish."};
  const recordings=tasks.filter(t=>t.kind!=="choice").map((t,i)=>{let audio=Buffer.alloc(0);if(phrases[t.taskId]){const wav=path.join(dir,i+".wav");execFileSync("espeak-ng",["-v","en-us","-s","145","-w",wav,phrases[t.taskId]!]);audio=readFileSync(wav)}return {task:t.taskId,mime:"audio/wav",audio}});
  const submission={attemptId:t.attempt_id,paper:"WH01",choices:tasks.filter(t=>t.kind==="choice").map(t=>({task:t.taskId,selected:t.correctOption!})),recordings};
  assert.equal((await q("SELECT exam_access_draft.grant_scoring_consent($1,$2,1) AS v",[owner,t.attempt_id]))[0].v,true);
  const stage=sealScoringStage(owner,submission,stageKey);
  assert.equal((await q("SELECT exam_access_draft.stage_research_scoring($1,$2,'WH01',$3,$4) AS v",[owner,t.attempt_id,stage.manifest,stage.ciphertext]))[0].v,"queued");
  const token=createParentSessionToken(owner,3600);
  const read=()=>fetch(archiveOrigin+"/api/platform/research/wuhan/reports/"+t.attempt_id,{headers:{Cookie:"socthink_parent_session="+token},cache:"no-store"});
  assert.equal((await read()).status,202);
  const started=Date.now();
  assert.equal(await runScoringWorkerOnce(pool,{origin,key,revision},stageKey,{origin:archiveOrigin,key:Buffer.from(process.env.SOCTHINK_RESEARCH_ARCHIVE_KEY!,"hex")},async a=>activeParentSessionVersion(a)),"completed");
  const res=await read();assert.equal(res.status,200);const report=await res.json();
  assert.equal(report.items.length,18);assert.equal(report.submitted,18);assert.equal(report.choice_correct,8);assert.equal(report.total_score,null);assert.equal(report.billable,false);
  assert.equal(report.items.find((x:any)=>x.task_id==="answer-gift-budget").state,"reference_match");
  assert.equal(report.items.find((x:any)=>x.task_id==="answer-train-platform").state,"unanswered");
  assert.equal((await q("SELECT count(*)::int AS n FROM exam_access_draft.research_scoring_stage WHERE attempt_id=$1",[t.attempt_id]))[0].n,0);
  console.log("R92_DURABLE_REAL_WORKER_PASS",JSON.stringify({elapsed:(Date.now()-started)/1000,submitted:report.submitted,spoken:4,empty:6,choices:8,manifestBound:true,stageDeleted:true}));
 }finally{p.kill();await new Promise<void>(r=>{if(p.exitCode!==null||p.signalCode!==null)r();else p.once("exit",()=>r())});rmSync(dir,{recursive:true,force:true});await pool.end()}
}
main().catch(e=>{console.error(e);process.exit(1)});
