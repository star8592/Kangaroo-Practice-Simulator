/**
 * Experimental ONLY. Hits the local Ollama API; no cloud calls or production billing.
 * Usage: npm run bench:career-local -- --model=qwen3:4b-instruct-2507-q4_K_M
 *        npm run bench:career-local -- --model=hf.co/ggml-org/Qwen3.8-27B-GGUF:Q4_K_M --ids=cs-project-outcome,sp-supplier-depth
 * Labels are provisional synthetic expectations, NOT scientific score validity.
 */
import {writeFileSync} from "node:fs";
import {JUDGE_CASES} from "./fixtures/career-judge-v1";
import {makeGuidedMessages,parseGuidedDecision} from "../src/lib/career-guided-interview";
import {EMPTY_INTERVIEW_JOB_CONTEXT} from "../src/lib/career-interview-context";

function opt(name:string,def:string){
 const match=process.argv.find(a=>a.startsWith("--"+name+"="));
 return match?match.slice(name.length+3):def;
}
const model=opt("model","qwen3:4b-instruct-2507-q4_K_M");
const ids=opt("ids","").split(",").filter(Boolean);
const timeout=Number(opt("timeout-ms","90000"));
const output=opt("output","");
if(!/^[\w.\-/:]+$/.test(model)||timeout<1000||timeout>180000)
 throw Error("Invalid model name or timeout");
const unknown=ids.filter(id=>!JUDGE_CASES.some(x=>x.id===id));
if(unknown.length)throw Error("Unknown case IDs: "+unknown.join(","));
const selected=JUDGE_CASES.filter(x=>!ids.length||ids.includes(x.id));
if(!selected.length)throw Error("No cases selected");

type Result={
 id:string;role:string;expected:string;predicted:string|null;valid:boolean;correct:boolean;
 elapsedMs:number;loadMs:number;promptMs:number;generationMs:number;tokens:number;
 doneReason:string|null;error:string|null;
};
const results:Result[]=[];
const startedAt=new Date().toISOString();
async function main(){
for(const test of selected){
 const input={profileId:test.profileId,questionId:test.questionId,answer:test.answer,context:EMPTY_INTERVIEW_JOB_CONTEXT};
 const body={model,think:false,stream:false,format:"json",
  messages:makeGuidedMessages(input),
  options:{num_ctx:2048,temperature:0.1,num_predict:220},
  keep_alive:"2m"};
 const start=performance.now();
 let row:Result={
  id:test.id,role:test.profileId,expected:test.expected,predicted:null,
  valid:false,correct:false,elapsedMs:0,loadMs:0,promptMs:0,generationMs:0,
  tokens:0,doneReason:null,error:null
 };
 try{
  const response=await fetch("http://127.0.0.1:11434/api/chat",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error("MODEL_HTTP_"+response.status);
  const data=await response.json();
  const decision=parseGuidedDecision(data.message?.content,test.answer);
  row={...row,valid:decision!==null,predicted:decision?.branch??null,
   correct:decision?.branch===test.expected,
   loadMs:Math.round((data.load_duration??0)/1e6),
   promptMs:Math.round((data.prompt_eval_duration??0)/1e6),
   generationMs:Math.round((data.eval_duration??0)/1e6),
   tokens:data.eval_count??0,doneReason:data.done_reason??null,
   error:decision?null:"INVALID_OR_EMPTY_OUTPUT"};
 }catch(error){row.error=error instanceof Error?error.name+":"+error.message:"UNKNOWN_ERROR";}
 row.elapsedMs=Math.round(performance.now()-start);
 results.push(row);
 console.log(JSON.stringify({id:row.id,expected:row.expected,got:row.predicted,valid:row.valid,ms:row.elapsedMs,error:row.error},null,0));
}
const sorted=results.map(x=>x.elapsedMs).sort((a,b)=>a-b);
const percentile=(p:number)=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]:null;
const summary={
 schema:"socthink-career-judge-benchmark-v1",model,startedAt,finishedAt:new Date().toISOString(),
 sampleSize:results.length,groundTruthStatus:"provisional synthetic author labels; expert adjudication pending",
 validCount:results.filter(x=>x.valid).length,
 exactBranchMatches:results.filter(x=>x.correct).length,
 exactBranchRate:results.filter(x=>x.correct).length/results.length,
 latencyMs:{p50:percentile(0.5),p95:percentile(0.95),max:sorted.at(-1)},
 modelComparisonCaveat:"sequential local requests; warm/cold loading and device contention influence latency",
 results,
};
console.log("BENCHMARK_SUMMARY="+JSON.stringify({
 model:summary.model,samples:summary.sampleSize,valid:summary.validCount,
 correct:summary.exactBranchMatches,accuracy:summary.exactBranchRate,
 latencyMs:summary.latencyMs},null,0));
if(output){writeFileSync(output,JSON.stringify(summary,null,2)+"\n");console.log("BENCHMARK_REPORT="+output);}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
