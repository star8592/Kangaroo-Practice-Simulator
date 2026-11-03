import {NextRequest,NextResponse} from "next/server";
import {billingConfigured} from "@/lib/billing-ledger";
import {getConfig} from "@/lib/career-model-routing";
import {careerModelDeliveryReady} from "@/lib/career-model-readiness";
import {verifiedInterviewBuyer,validCareerOrigin} from "@/lib/career-interview-security";
import {startPaidCareerSession,CareerCreditsRequired,CareerSessionUnavailable} from "@/lib/career-service-ledger";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization","X-Robots-Tag":"noindex"};
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:NO_STORE});
/** Creates one idempotent 2-hour interview right, debiting exactly one verified paid session. */
export async function POST(req:NextRequest){
 const config=getConfig();
 if(!billingConfigured()||!config||process.env.SOCTHINK_CAREER_AI_BILLING_ENABLED!=="1")
  return reply({code:"INTERVIEW_AI_NOT_READY"},503);
 if(!validCareerOrigin(req))return reply({code:"INVALID_ORIGIN"},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return reply({code:"INVALID_CONTENT_TYPE"},415);
 const buyerId=verifiedInterviewBuyer(req);
 if(!buyerId)return reply({code:"WECHAT_LOGIN_REQUIRED"},401);
 let data:unknown;
 try{
  const raw=await req.text();
  if(raw.length>1500)return reply({code:"REQUEST_TOO_LARGE"},413);
  data=JSON.parse(raw);
 }catch{return reply({code:"BAD_REQUEST"},400);}
 if(!data||typeof data!=="object"||Array.isArray(data))return reply({code:"INVALID_REQUEST"},400);
 const d=data as Record<string,unknown>;
 if(typeof d.profileId!=="string"||typeof d.clientRequestId!=="string")
  return reply({code:"INVALID_REQUEST"},400);
 // A configured but unreachable LLM may not consume the first purchased session.
 if(!await careerModelDeliveryReady(config))return reply({code:"AI_DELIVERY_UNAVAILABLE"},503);
 try{
  const result=await startPaidCareerSession({buyerId,profileId:d.profileId,clientRequestId:d.clientRequestId});
  return reply({...result,expiresInSeconds:7200});
 }catch(error){
  if(error instanceof CareerCreditsRequired)return reply({code:"INTERVIEW_PAYMENT_REQUIRED"},402);
  if(error instanceof CareerSessionUnavailable)return reply({code:"INTERVIEW_SESSION_EXPIRED"},409);
  if(error instanceof Error&&error.message.startsWith("Invalid interview session request"))
   return reply({code:"INVALID_REQUEST"},400);
  return reply({code:"SESSION_SERVICE_UNAVAILABLE"},503);
 }
}
