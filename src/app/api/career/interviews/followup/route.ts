import {NextRequest,NextResponse} from "next/server";
import {getInterviewProfile} from "@/lib/career-interview-scenarios";
import {
 validateSemanticRequest,parseSemanticContent,makeSemanticMessages
} from "@/lib/career-semantic-followup";
import {getConfig,callModel,modelTimeout,providerLabels} from "@/lib/career-model-routing";
import {makeGuidedMessages,parseGuidedDecision,composeGuidedFollowup} from "@/lib/career-guided-interview";
export const runtime="nodejs";
export const dynamic="force-dynamic";

const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{
 "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"
}});
const buckets=new Map<string,{window:number;count:number}>();
// A modest global circuit-breaker limits model spend even if client IPs are spoofed.
let globalBudget={window:0,count:0};
function withinRateLimit(ip:string){
 const now=Date.now(),key=ip.slice(0,100);
 if(now-globalBudget.window>=3600000)globalBudget={window:now,count:0};
 if(globalBudget.count>=120)return false;
 if(buckets.size>2000){
  for(const [k,v] of buckets)if(now-v.window>60000)buckets.delete(k);
 }
 const old=buckets.get(key);
 if(!old||now-old.window>=60000){buckets.set(key,{window:now,count:1});globalBudget.count++;return true;}
 if(old.count>=6)return false;
 old.count++;globalBudget.count++;return true;
}
function isSameOrigin(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin)return false;
 try{
  const url=new URL(origin);
  return url.origin===req.nextUrl.origin||url.origin==="https://socthink.cn"||url.host===req.headers.get("host");
 }catch{return false;}
}
export async function GET(){
 const cfg=getConfig();
 return json({enabled:Boolean(cfg),provider:cfg?.primary==="ollama"?"local":cfg?"external":null,
  providers:cfg?[providerLabels[cfg.primary],...(cfg.backup?[providerLabels[cfg.backup]]:[])]:[]});
}
export async function POST(req:NextRequest){
 const cfg=getConfig();
 if(!cfg)return json({code:"AI_UNAVAILABLE"},503);
 if(!isSameOrigin(req))return json({code:"INVALID_ORIGIN"},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return json({code:"INVALID_CONTENT_TYPE"},415);
 const size=Number(req.headers.get("content-length")||0);
 if(size>11000)return json({code:"PAYLOAD_TOO_LARGE"},413);
 const ip=req.headers.get("x-forwarded-for")?.split(",").at(0)?.trim()
  ||req.headers.get("x-real-ip")||"shared";
 if(!withinRateLimit(ip))return json({code:"RATE_LIMITED"},429);
 let input:unknown;
 try{
  const body=await req.text();
  if(body.length>11000)return json({code:"PAYLOAD_TOO_LARGE"},413);
  input=JSON.parse(body);
 }catch{return json({code:"BAD_JSON"},400);}
 if(!validateSemanticRequest(input))return json({code:"INVALID_REQUEST"},400);
 const data=input;
 const profile=getInterviewProfile(data.profileId)!;
 const question=profile.questions.find(q=>q.id===data.questionId)!;
 const style=process.env.SOCTHINK_INTERVIEW_AI_STYLE==="free"?"free":"guided";
 const messages=style==="guided"?makeGuidedMessages(data):makeSemanticMessages(data);
 const providers=[cfg.primary,...(cfg.backup?[cfg.backup]:[])];
 for(let i=0;i<providers.length;i++){
  const provider=providers[i];
  try{
   const result=await callModel(provider,messages,modelTimeout(i===0?"primary":"backup"));
   if(style==="guided"){
    const decision=parseGuidedDecision(result.content,data.answer);
    if(!decision)continue;
    const followup=composeGuidedFollowup(question,decision);
    return json({mode:"guided",question:followup.question,evidenceQuote:followup.evidenceQuote,
     reason:followup.reason,branch:followup.branch,provider:providerLabels[provider],latencyMs:result.latencyMs});
   }
   const free=parseSemanticContent(result.content,data.answer);
   if(!free)continue;
   return json({mode:"semantic",question:free.question,evidenceQuote:free.evidenceQuote,
    reason:free.reason,provider:providerLabels[provider],latencyMs:result.latencyMs});
  }catch{/* Primary unavailable/invalid: try configured backup, then client rules. */}
 }
 return json({code:"MODEL_UNAVAILABLE"},503);
}
