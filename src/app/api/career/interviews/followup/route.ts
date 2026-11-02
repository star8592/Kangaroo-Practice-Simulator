import {NextRequest,NextResponse} from "next/server";
import {getInterviewProfile} from "@/lib/career-interview-scenarios";
import {
 validateSemanticRequest,parseSemanticContent,makeSemanticMessages
} from "@/lib/career-semantic-followup";
export const runtime="nodejs";
export const dynamic="force-dynamic";

type Provider="openai"|"ollama";
function providerReady():Provider|null{
 if(process.env.SOCTHINK_INTERVIEW_AI_ENABLED!=="1")return null;
 if(process.env.SOCTHINK_INTERVIEW_AI_PROVIDER==="ollama")return "ollama";
 if(process.env.SOCTHINK_INTERVIEW_AI_PROVIDER==="openai"&&process.env.OPENAI_API_KEY)return "openai";
 return null;
}
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
 const provider=providerReady();
 return json({enabled:provider!==null,provider:provider==="ollama"?"local":provider==="openai"?"external":null});
}
export async function POST(req:NextRequest){
 const provider=providerReady();
 if(!provider)return json({code:"AI_UNAVAILABLE"},503);
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
 const messages=makeSemanticMessages(data);
 const signal=AbortSignal.timeout(12500);
 try{
  let result:Response;
  if(provider==="openai"){
   result=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",signal,cache:"no-store",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY!}`},
    body:JSON.stringify({
     model:process.env.SOCTHINK_INTERVIEW_AI_MODEL||"gpt-4.1-mini",
     messages,
     response_format:{type:"json_schema",json_schema:{
      name:"interview_followup",strict:true,
      schema:{type:"object",additionalProperties:false,properties:{
       question:{type:"string"},evidenceQuote:{type:"string"},reason:{type:"string"}
      },required:["question","evidenceQuote","reason"]}
     }},
     max_completion_tokens:350,
    })
   });
  }else{
   result=await fetch("http://127.0.0.1:11434/api/chat",{
    method:"POST",signal,cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
     model:process.env.SOCTHINK_INTERVIEW_AI_MODEL||"qwen3:8b",
     messages,stream:false,format:"json",options:{temperature:0.25,num_predict:350}
    })
   });
  }
  if(!result.ok)return json({code:"MODEL_UNAVAILABLE"},503);
  const raw=await result.text();
  if(raw.length>20000)return json({code:"MODEL_INVALID_RESPONSE"},502);
  const parsed=JSON.parse(raw);
  const content=provider==="openai"?parsed.choices?.[0]?.message?.content:parsed.message?.content;
  const followup=parseSemanticContent(content,data.answer);
  if(!followup)return json({code:"MODEL_INVALID_RESPONSE"},502);
  // Do not log model or user data. No server-side transcript storage.
  return json({mode:"semantic",question:followup.question,evidenceQuote:followup.evidenceQuote,reason:followup.reason,phase:question.phase});
 }catch{
  return json({code:"MODEL_UNAVAILABLE"},503);
 }
}
