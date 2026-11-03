import {NextRequest,NextResponse} from "next/server";
import {getInterviewProfile} from "@/lib/career-interview-scenarios";
import {
 validateSemanticRequest,parseSemanticContent,makeSemanticMessages
} from "@/lib/career-semantic-followup";
import {getConfig,withModelBackup,providerLabels} from "@/lib/career-model-routing";
import {makeGuidedMessages,parseGuidedDecision,composeGuidedFollowup} from "@/lib/career-guided-interview";
import {makeGuidedEvidenceMessages,parseGuidedEvidence} from "@/lib/career-guided-evidence";
import {billingConfigured} from "@/lib/billing-ledger";
import {verifiedInterviewBuyer,validCareerOrigin} from "@/lib/career-interview-security";
import {getPaidCareerSessionAvailability,claimPaidCareerRound,finishPaidCareerRound,
 CareerSessionUnavailable,CareerRoundUnavailable} from "@/lib/career-service-ledger";
export const runtime="nodejs";
export const dynamic="force-dynamic";

type SemanticRequestWithSession={sessionId?:unknown};
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
export async function GET(req:NextRequest){
 const cfg=getConfig();
 if(!cfg || !billingConfigured() || process.env.SOCTHINK_CAREER_AI_BILLING_ENABLED!=="1")
  return json({enabled:false,provider:null,providers:[]});
 const buyerId=verifiedInterviewBuyer(req);
 const profileId=req.nextUrl.searchParams.get("profileId")??"";
 if(!buyerId || !getInterviewProfile(profileId))
  return json({enabled:false,provider:null,providers:[],reason:"WECHAT_LOGIN_OR_PURCHASE_REQUIRED"});
 try{
  const available=await getPaidCareerSessionAvailability(buyerId,profileId);
  if(!available.available)return json({enabled:false,provider:null,providers:[],reason:"INTERVIEW_PAYMENT_REQUIRED"});
  return json({enabled:true,provider:cfg.primary==="ollama"?"local":"external",
   providers:[providerLabels[cfg.primary],...(cfg.backup?[providerLabels[cfg.backup]]:[])],
   remainingSessions:available.remainingSessions,activeSessions:available.activeSessions});
 }catch{return json({enabled:false,provider:null,providers:[],reason:"ENTITLEMENT_CHECK_UNAVAILABLE"},503);}
}
export async function POST(req:NextRequest){
 const cfg=getConfig();
 if(!cfg || !billingConfigured() || process.env.SOCTHINK_CAREER_AI_BILLING_ENABLED!=="1")
  return json({code:"AI_UNAVAILABLE"},503);
 if(!validCareerOrigin(req))return json({code:"INVALID_ORIGIN"},403);
 const buyerId=verifiedInterviewBuyer(req);
 if(!buyerId)return json({code:"WECHAT_LOGIN_REQUIRED"},401);
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
 const sessionId=(input as SemanticRequestWithSession).sessionId;
 if(typeof sessionId!=="string")return json({code:"INTERVIEW_SESSION_REQUIRED"},403);
 let claimToken:string;
 try{
  const claimed=await claimPaidCareerRound({buyerId,profileId:data.profileId,sessionId,questionId:data.questionId});
  claimToken=claimed.claimToken;
 }catch(error){
  if(error instanceof CareerSessionUnavailable)return json({code:"INTERVIEW_PAYMENT_REQUIRED"},403);
  if(error instanceof CareerRoundUnavailable)return json({code:"INTERVIEW_ROUND_ALREADY_USED"},409);
  return json({code:"INTERVIEW_ENTITLEMENT_UNAVAILABLE"},503);
 }
 let completed=false;
 try{
 const profile=getInterviewProfile(data.profileId)!;
 const question=profile.questions.find(q=>q.id===data.questionId)!;
 const style=process.env.SOCTHINK_INTERVIEW_AI_STYLE==="free"?"free"
  :process.env.SOCTHINK_INTERVIEW_AI_STYLE==="guided-branch"?"guided-branch":"guided";
 if(style!=="free"){
  const messages=style==="guided"?makeGuidedEvidenceMessages(data):makeGuidedMessages(data);
  const parser=style==="guided"?parseGuidedEvidence:parseGuidedDecision;
  const resolved=await withModelBackup(cfg,messages,text=>parser(text,data.answer));
  if(!resolved)return json({code:"MODEL_UNAVAILABLE"},503);
  completed=true;
  const selected=composeGuidedFollowup(question,resolved.result);
  return json({mode:"guided",strategy:style==="guided"?"evidence-extraction":"branch-choice",
   question:selected.question,evidenceQuote:selected.evidenceQuote,reason:selected.reason,
   branch:selected.branch,provider:providerLabels[resolved.provider],
   viaBackup:resolved.viaBackup,latencyMs:resolved.latencyMs});
 }
 const resolved=await withModelBackup(cfg,makeSemanticMessages(data),text=>parseSemanticContent(text,data.answer));
 if(!resolved)return json({code:"MODEL_UNAVAILABLE"},503);
 completed=true;
 const free=resolved.result;
 return json({mode:"semantic",question:free.question,evidenceQuote:free.evidenceQuote,
  reason:free.reason,provider:providerLabels[resolved.provider],
  viaBackup:resolved.viaBackup,latencyMs:resolved.latencyMs});
 }finally{
  // Never charge another session for a retry; a failed model invocation is retryable once.
  await finishPaidCareerRound({sessionId,questionId:data.questionId,claimToken,success:completed});
 }
}
