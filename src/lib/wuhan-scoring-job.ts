// Trusted server worker only. No browser import or public upload handler.
// A manifest is built from authoritative staging, not client-provided scores.
import {createHash} from "node:crypto";
import contract from "../../backend/socthink-core/src/wuhan-research-report-contract.json";
import {scorePrivateBatch,type PracticeBatchItem} from "./wuhan-private-practice-transport";
type Obj=Record<string,unknown>;
type Choice={task:string;selected:number};
type Audio={task:string;mime:string;audio:Uint8Array};
export type ScoringSubmission={attemptId:string;paper:string;choices:readonly Choice[];recordings:readonly Audio[]};
type Settings=Parameters<typeof scorePrivateBatch>[0];
const hex32=/^[a-f0-9]{32}$/;
const hex64=/^[a-f0-9]{64}$/;
const sha=(v:Buffer|string)=>createHash("sha256").update(v).digest("hex");
const asObj=(x:unknown):Obj=>{if(!x||typeof x!=="object"||Array.isArray(x))throw Error("invalid scorer object");return x as Obj};
export function prepareScoringSubmission(s:ScoringSubmission){
 if(!hex32.test(s.attemptId))throw Error("invalid attempt");
 const paper=contract.papers.find(p=>p.paperId===s.paper);
 if(!paper||s.choices.length>8||s.recordings.length>10)throw Error("invalid paper or answer count");
 const seen=new Set<string>(),choices=new Map<string,number>(),audio=new Map<string,PracticeBatchItem>();
 for(const c of s.choices){
  const t=paper.tasks.find(x=>x.taskId===c.task);
  if(!t||t.kind!=="choice"||seen.has(c.task)||!Number.isInteger(c.selected)||c.selected<0||c.selected>=(t.optionCount??0))throw Error("invalid choice");
  seen.add(c.task);choices.set(c.task,c.selected);
 }
 for(const r of s.recordings){
  const t=paper.tasks.find(x=>x.taskId===r.task);
  if(!t||t.kind==="choice"||seen.has(r.task)||!["audio/wav","audio/webm","audio/ogg","audio/mp4"].includes(r.mime)||r.audio.byteLength>2*1024*1024)throw Error("invalid recording");
  seen.add(r.task);audio.set(r.task,{paper:s.paper,task:r.task,mime:r.mime,audio:Buffer.from(r.audio)});
 }
 const entries=paper.tasks.map(t=>{
  const a=audio.get(t.taskId);
  return a?{task:t.taskId,mime:a.mime,bytes:a.audio.byteLength,sha256:sha(Buffer.from(a.audio))}:choices.has(t.taskId)?{task:t.taskId,selected:choices.get(t.taskId)}:{task:t.taskId,missing:true};
 });
 const manifest={version:1,attemptId:s.attemptId,paper:s.paper,rubricSha256:contract.rubricSha256,entries};
 return {paper,choices,audio,manifest,manifestSha256:sha(JSON.stringify(manifest))};
}
// authorize must recheck session, scoped recording consent, and current lease.
// Callers are required to provide an actual authorization adapter.
export async function buildScoringReport(s:ScoringSubmission,expectedManifest:string,settings:Settings,authorize:()=>Promise<boolean>){
 const p=prepareScoringSubmission(s);
 if(!hex64.test(expectedManifest)||p.manifestSha256!==expectedManifest)throw Error("manifest mismatch");
 const allowed=async()=>{if(!await authorize())throw Error("authorization or lease revoked")};
 await allowed();
 const receipts=new Map<string,Obj>(),rpcReceipts:Obj[]=[];
 const audio=[...p.paper.tasks.flatMap(t=>p.audio.has(t.taskId)?[p.audio.get(t.taskId)!]:[])];
 // No concurrent batch fan-out: inference host has a single admission gate.
 for(let start=0;start<audio.length;start+=6){
  await allowed();
  const batch=audio.slice(start,start+6);
  const envelope=await scorePrivateBatch(settings,batch);
  const results=envelope.results as unknown[];
  for(let i=0;i<batch.length;i++){
   const candidate=asObj(results[i]),scope=asObj(candidate.scope);
   // Transport already checked RPC nonce, paper/task and audio evidence shape.
   // Bind the validated result to the exam ID; retain original scope in digest.
   rpcReceipts.push({scope:{...scope},task:batch[i]!.task});
   receipts.set(batch[i]!.task,{...candidate,scope:{...scope,attempt_id:s.attemptId}});
  }
 }
 await allowed();
 let correct=0,wrong=0,submitted=0;
 const items=p.paper.tasks.map(t=>{
  const base={task_id:t.taskId,kind:t.kind};
  if(p.choices.has(t.taskId)){
   const selected=p.choices.get(t.taskId)!;const state=selected===t.correctOption?"correct":"incorrect";
   if(state==="correct")correct++;else wrong++;submitted++;
   return {...base,state,candidate:{scope:{attempt_id:s.attemptId,paper_id:s.paper,task_id:t.taskId,audio_sha256:sha("choice-v1:"+selected)},status:state,selected_option:selected,official_score:false}};
  }
  const c=receipts.get(t.taskId);
  if(!c)return {...base,state:"not_submitted",candidate:null};
  submitted++;
  return {...base,state:String(t.kind==="read"?asObj(c.diagnosis).status:c.status),candidate:c};
 });
 const report={attempt_id:s.attemptId,paper_id:s.paper,finalized:true,billable:false,official_score:false,report_status:"research",total_score:null,total_tasks:18,submitted,choice_correct:correct,choice_incorrect:wrong,choice_unsubmitted:8-correct-wrong,rubric_sha256:contract.rubricSha256,machine_rule_revision:settings.revision,items};
 return {...report,report_evidence_sha256:sha(JSON.stringify({manifest:expectedManifest,rpcReceipts,report}))};
}
