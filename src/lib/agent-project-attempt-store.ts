/** Durable per-account formative Agent code attempts.
 * Source is re-evaluated by the server but NEVER stored, only its SHA-256.
 * Uses the same private writable user-data root and atomic hard-link
 * semantics as the existing career practice history (single-host only).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {CodeCheck} from "./code-lab-engine";
import {AGENT_PROJECT_CODE_VERSION,AGENT_PROJECT_CODE_CHALLENGES} from "./agent-project-code";
import {userDataPath} from "./user-data-store";

const ROOT=userDataPath("agent-project-code-attempts");
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const isAgentAttemptId=(value:unknown):value is string=>typeof value==="string"&&UUID.test(value);
export class AgentAttemptConflictError extends Error{constructor(){super("AGENT_ATTEMPT_ID_CONFLICT");}}
export type AgentCodeAttemptSummary=Readonly<{
 attemptId:string;taskId:string;passed:number;total:number;
 correct:boolean;submittedAt:number;
}>;
type StoredAttempt=Readonly<{
 version:typeof AGENT_PROJECT_CODE_VERSION;
 ownerId:string;fingerprint:string;summary:AgentCodeAttemptSummary;
}>;

function ownerDirectory(ownerId:string){
 if(!/^(wx_|guest_family_)[0-9a-f]{32}$/.test(ownerId))throw Error("INVALID_AGENT_OWNER");
 return path.join(ROOT,crypto.createHash("sha256")
  .update("socthink:agent-project-owner:v1:"+ownerId).digest("hex"));
}
function filename(ownerId:string,attemptId:string){
 if(!isAgentAttemptId(attemptId))throw Error("INVALID_AGENT_ATTEMPT");
 return path.join(ownerDirectory(ownerId),attemptId.toLowerCase()+".json");
}
function fingerprint(taskId:string,source:string){
 return crypto.createHash("sha256").update(JSON.stringify([AGENT_PROJECT_CODE_VERSION,taskId,source])).digest("hex");
}
function validated(x:unknown,ownerId:string):StoredAttempt{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("CORRUPTED_AGENT_ATTEMPT");
 const v=x as StoredAttempt;
 if(v.version!==AGENT_PROJECT_CODE_VERSION||v.ownerId!==ownerId||
    !isAgentAttemptId(v.summary?.attemptId)||
    !AGENT_PROJECT_CODE_CHALLENGES.some(t=>t.id===v.summary?.taskId)||
    !/^[a-f0-9]{64}$/.test(v.fingerprint)||
    !Number.isInteger(v.summary?.passed)||
    !Number.isInteger(v.summary?.total)||
    v.summary.passed<0||v.summary.passed>v.summary.total||
    v.summary.total<1||v.summary.total>20||
    v.summary.correct!==(v.summary.passed===v.summary.total)||
    !Number.isFinite(v.summary?.submittedAt))
  throw Error("CORRUPTED_AGENT_ATTEMPT");
 return v;
}
export function readAgentCodeAttempt(ownerId:string,attemptId:string):StoredAttempt|null{
 try{return validated(JSON.parse(fs.readFileSync(filename(ownerId,attemptId),"utf8")),ownerId);}
 catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return null;throw e;}
}
export function recordAgentCodeAttempt(input:{
 ownerId:string;attemptId:string;taskId:string;source:string;grade:CodeCheck;
 submittedAt?:number;
}):{summary:AgentCodeAttemptSummary;alreadySaved:boolean}{
 const {ownerId,attemptId,taskId,source,grade}=input;
 const task=AGENT_PROJECT_CODE_CHALLENGES.find(x=>x.id===taskId);
 if(!task||!isAgentAttemptId(attemptId)||grade.taskId!==taskId||
    grade.total!==task.cases.length||grade.passed<0||grade.passed>grade.total||
    grade.correct!==(grade.passed===grade.total)||typeof source!=="string"||
    !source.trim()||source.length>5000)throw Error("INVALID_AGENT_ATTEMPT");
 const digest=fingerprint(taskId,source);
 const prior=readAgentCodeAttempt(ownerId,attemptId);
 if(prior){
  if(prior.fingerprint!==digest||prior.summary.taskId!==taskId)throw new AgentAttemptConflictError();
  return {summary:prior.summary,alreadySaved:true};
 }
 const folder=ownerDirectory(ownerId),dst=filename(ownerId,attemptId);
 fs.mkdirSync(folder,{recursive:true,mode:0o700});
 const record:StoredAttempt={version:AGENT_PROJECT_CODE_VERSION,ownerId,fingerprint:digest,
  summary:{attemptId:attemptId.toLowerCase(),taskId,passed:grade.passed,
   total:grade.total,correct:grade.correct,submittedAt:input.submittedAt??Date.now()}};
 const tmp=dst+".tmp-"+crypto.randomBytes(8).toString("hex");
 let fd:number|undefined;
 try{
  fd=fs.openSync(tmp,"wx",0o600);
  fs.writeFileSync(fd,JSON.stringify(record));fs.fsyncSync(fd);
 }finally{if(fd!==undefined)fs.closeSync(fd);}
 try{
  fs.linkSync(tmp,dst);
  return {summary:record.summary,alreadySaved:false};
 }catch(e){
  if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;
  const winner=readAgentCodeAttempt(ownerId,attemptId);
  if(!winner)throw Error("AGENT_ATTEMPT_UNAVAILABLE",{cause:e});
  if(winner.fingerprint!==digest||winner.summary.taskId!==taskId)throw new AgentAttemptConflictError();
  return {summary:winner.summary,alreadySaved:true};
 }finally{try{fs.unlinkSync(tmp);}catch{/* best effort */}}
}
export function listAgentCodeAttemptSummaries(ownerId:string,limit=30):AgentCodeAttemptSummary[]{
 const folder=ownerDirectory(ownerId);
 let names:string[];
 try{names=fs.readdirSync(folder).filter(f=>f.endsWith(".json")&&UUID.test(f.slice(0,-5)));}
 catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return [];throw e;}
 return names.map(name=>readAgentCodeAttempt(ownerId,name.slice(0,-5))!.summary)
  .sort((a,b)=>b.submittedAt-a.submittedAt||b.attemptId.localeCompare(a.attemptId))
  .slice(0,Math.max(1,Math.min(50,limit)));
}
