/** Commercial AI service readiness, not just a TCP port or configured API key.
 * A known, synthetic interview answer must produce grounded, schema-valid evidence
 * before new WeChat orders or paid session reservations can be offered.
 * The only shared cache is this bounded, in-process delivery probe.
 */
import {EMPTY_INTERVIEW_JOB_CONTEXT} from "./career-interview-context";
import {makeGuidedEvidenceMessages,parseGuidedEvidence} from "./career-guided-evidence";
import {callModel,withModelBackup,type Config} from "./career-model-routing";

const ANSWER="我亲自负责订单接口，压测300次并发请求且重复订单为零，测试报告存入CI仓库。";
const INPUT={profileId:"campus-software",questionId:"cs-project",answer:ANSWER,
 context:EMPTY_INTERVIEW_JOB_CONTEXT};

/** Injectable caller enables isolated tests without cloud calls or bought credits. */
export async function probeCareerModelDelivery(
 config:Config,caller:typeof callModel=callModel,
):Promise<boolean>{
 try{
  const result=await withModelBackup(config,makeGuidedEvidenceMessages(INPUT),
   response=>{
    const parsed=parseGuidedEvidence(response,ANSWER);
    return parsed?.branch==="depth"?parsed:null;
   },caller);
  return result!==null;
 }catch{return false;}
}

type Cache={key:string;ready:boolean;expires:number;pending?:Promise<boolean>};
let cache:Cache|null=null;
function configKey(cfg:Config):string{
 // Never cache API credentials or user answers.
 return [cfg.primary,cfg.backup??"",
  process.env.SOCTHINK_INTERVIEW_AI_MODEL??"",
  process.env.SOCTHINK_INTERVIEW_AI_BACKUP_MODEL??""].join("|");
}

/** Recheck every 30s when healthy and every 8s after failure.
 * Only a real parseable model response authorizes a new paid sale.
 * An outage during a paid interview is handled by its round/credit ledger.
 */
export function careerModelDeliveryReady(config:Config):Promise<boolean>{
 const key=configKey(config),now=Date.now();
 if(cache?.key===key){
  if(cache.pending)return cache.pending;
  if(now<cache.expires)return Promise.resolve(cache.ready);
 }
 const pending=probeCareerModelDelivery(config).then(ready=>{
  if(cache?.key===key)cache={key,ready,expires:Date.now()+(ready?30000:8000)};
  return ready;
 }).catch(()=>{
  if(cache?.key===key)cache={key,ready:false,expires:Date.now()+8000};
  return false;
 });
 cache={key,ready:false,expires:0,pending};
 return pending;
}
