// Dedicated private worker. No browser routes. Explicit runtime config.
import {Pool} from "pg";
import {constants,openSync,fstatSync,readFileSync,closeSync} from "node:fs";
import {runScoringWorkerOnce} from "../src/lib/wuhan-scoring-worker";
import {createHmac} from "node:crypto";
function secret(name:string){
 const fd=openSync(process.env[name]||"",constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const st=fstatSync(fd);if(!st.isFile()||st.size>4096||(st.mode&0o077)!==0)throw Error("private credential required");return readFileSync(fd,"utf8").trim()}finally{closeSync(fd)}
}
function key(name:string){const k=secret(name);if(!/^[a-f0-9]{64}$/.test(k))throw Error("invalid credential");return Buffer.from(k,"hex")}
function localOrigin(value:string|undefined){if(!value||!/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(value))throw Error("local origin required");return value}
async function main(){
 if(process.env.SOCTHINK_WUHAN_WORKER_ENABLED!=="1")throw Error("worker disabled");
 const db=secret("SOCTHINK_WUHAN_WORKER_DB_FILE"),url=new URL(db);
 if(!["postgres:","postgresql:"].includes(url.protocol)||!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/socthink_wuhan_scoring_prod"||url.username!=="wuhan_scoring_worker_runtime")throw Error("dedicated worker DB required");
 const stageKey=key("SOCTHINK_WUHAN_STAGE_KEY_FILE"),rpcKey=key("SOCTHINK_WUHAN_PRIVATE_KEY_FILE"),archiveKey=key("SOCTHINK_WUHAN_ARCHIVE_KEY_FILE");
 if(stageKey.equals(rpcKey)||stageKey.equals(archiveKey)||archiveKey.equals(rpcKey))throw Error("separate credentials required");
 const revision=process.env.SOCTHINK_WUHAN_PRIVATE_REVISION||"";
 if(!/^[a-f0-9]{64}$/.test(revision))throw Error("pinned scorer revision required");

 const settings={origin:localOrigin(process.env.SOCTHINK_WUHAN_PRIVATE_ORIGIN),key:rpcKey,revision};
 const archive={origin:localOrigin(process.env.SOCTHINK_WUHAN_ARCHIVE_ORIGIN),key:archiveKey};
 const pool=new Pool({connectionString:db,max:2,connectionTimeoutMillis:3000,statement_timeout:15000,application_name:"wuhan-scoring-worker"});
 let stopped=false;process.once("SIGTERM",()=>{stopped=true});process.once("SIGINT",()=>{stopped=true});
 try{
  const check=(await pool.query("SELECT has_function_privilege(current_user,'exam_access_draft.claim_research_scoring()','EXECUTE') AND NOT has_table_privilege(current_user,'exam_access_draft.research_scoring_stage','SELECT') AND NOT has_function_privilege(current_user,'exam_access_draft.complete_research_scoring(text,text,uuid,text,jsonb)','EXECUTE') AS ok")).rows[0];
  if(!check?.ok)throw Error("worker role too broad or unavailable");
  for(const origin of [settings.origin,archive.origin])if(!(await fetch(origin+"/healthz",{signal:AbortSignal.timeout(3000),redirect:"error"})).ok)throw Error("dependency unavailable");
  console.log("WUHAN_SCORING_WORKER_READY");
  while(!stopped){
   const result=await runScoringWorkerOnce(pool,settings,stageKey,archive,async (owner,attempt,paper,lease)=>{
    const body=JSON.stringify({owner_id:owner,attempt_id:attempt,paper_id:paper,lease_id:lease});
    const sig=createHmac("sha256",archiveKey).update("wuhan-scoring-access-v1\0").update(body).digest("hex");
    const response=await fetch(archive.origin+"/internal/research/wuhan/check-scoring-access",{method:"POST",headers:{"Content-Type":"application/json","x-research-signature":sig},body,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(5000)});
    if(!response.ok)return null;
    const result=await response.json();
    return result.code==="ACCESS_CONFIRMED"&&Number.isSafeInteger(result.session_version)?result.session_version:null;
   });
   if(result!=="idle")console.log("WUHAN_SCORING_TICK",result);
   await new Promise(r=>setTimeout(r,result==="idle"?5000:1000));
  }
 }finally{await pool.end();stageKey.fill(0);rpcKey.fill(0);archiveKey.fill(0)}
}
main().catch(()=>{console.error("WUHAN_SCORING_WORKER_STOPPED");process.exitCode=1});
