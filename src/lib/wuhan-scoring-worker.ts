// One bounded worker tick. Production scheduling and live account adapter are separate.
import type {Pool} from "pg";
import {createHmac} from "node:crypto";
import {openScoringStage} from "./wuhan-scoring-stage";
import {buildScoringReport} from "./wuhan-scoring-job";
type Settings=Parameters<typeof buildScoringReport>[2];
export async function runScoringWorkerOnce(pool:Pool,settings:Settings,stageKey:Buffer,archive:{origin:string;key:Buffer},liveVersion:(owner:string,attempt:string,paper:string,lease:string)=>Promise<number|null>){
 if(!/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(archive.origin)||archive.key.length!==32)throw Error("invalid internal archive settings");
 await pool.query("SELECT exam_access_draft.cleanup_scoring_stage()");
 const job=(await pool.query("SELECT exam_access_draft.claim_research_scoring() AS v")).rows[0]?.v;
 if(!job)return "idle";
 const id=String(job.attempt_id),lease=String(job.lease_id);
 let input:ReturnType<typeof openScoringStage>|undefined;
 try{
  const row=(await pool.query("SELECT * FROM exam_access_draft.load_research_scoring($1,$2)",[id,lease])).rows[0];
  if(!row||row.manifest_sha256!==job.manifest_sha256)throw Error("stage unavailable");
  const allowed=async()=>await liveVersion(row.owner_id,id,row.paper_id,lease)===Number(row.session_version)&&(await pool.query("SELECT exam_access_draft.renew_scoring_lease($1,$2) AS v",[id,lease])).rows[0]?.v===true;
  if(!await allowed())throw Error("authorization revoked");
  input=openScoringStage(row.owner_id,id,row.manifest_sha256,row.ciphertext,stageKey);
  if(input.paper!==row.paper_id)throw Error("paper mismatch");
  const report=await buildScoringReport(input,row.manifest_sha256,settings,allowed);
  if(!await allowed())throw Error("authorization revoked");
  const body=JSON.stringify({owner_id:row.owner_id,lease_id:lease,manifest_sha256:row.manifest_sha256,report});
  const sig=createHmac("sha256",archive.key).update("wuhan-research-async-complete-v1\0").update(body).digest("hex");
  const response=await fetch(archive.origin+"/internal/research/wuhan/complete-scoring",{method:"POST",headers:{"Content-Type":"application/json","x-research-signature":sig},body,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error("archive unavailable");
  const receipt=await response.json();
  if(receipt.code!=="completed"||receipt.attempt_id!==id||receipt.billable!==false)throw Error("archive receipt mismatch");
  return "completed";
 }catch{
  // If the ACK was lost after commit, the old lease cannot reopen the job.
  const r=await pool.query("SELECT exam_access_draft.finish_research_scoring($1,$2,false) AS v",[id,lease]);
  return String(r.rows[0]?.v??"failed");
 }finally{
  for(const r of input?.recordings??[])r.audio.fill(0);
  await pool.query("SELECT exam_access_draft.cleanup_scoring_stage()");
 }
}
