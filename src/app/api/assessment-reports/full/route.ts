import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {billingConfigured,hasVerifiedItemEntitlement} from "@/lib/billing-ledger";
import {getInstrument} from "@/lib/measurement-center";
import {buildDetailedReport} from "@/lib/assessment-report-detail";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0","Vary":"Cookie","X-Robots-Tag":"noindex, nofollow"};
function response(data:object,status:number){return NextResponse.json(data,{status,headers});}

/** Only a settled, user-owned server ledger grant unlocks personalized detail.
 * No answers are stored. The request body is processed in memory and discarded.
 */
export async function POST(req:NextRequest){
 if(!billingConfigured())return response({code:"REPORT_NOT_READY"},503);
 if(req.headers.get("origin")!==process.env.SOCTHINK_PUBLIC_ORIGIN ||
    req.headers.get("sec-fetch-site")==="cross-site")return response({code:"INVALID_ORIGIN"},403);
 const account=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!account?.active||!(account.wechatId||account.wechatOpenId))
  return response({code:"WECHAT_LOGIN_REQUIRED"},401);
 let id:string,answers:Record<string,number>;
 try{
  const raw=await req.text();
  if(raw.length>8192)return response({code:"REQUEST_TOO_LARGE"},413);
  const parsed:unknown=JSON.parse(raw);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return response({code:"INVALID_PAYLOAD"},400);
  const data=parsed as Record<string,unknown>;
  if(typeof data.instrumentId!=="string"||!data.answers||typeof data.answers!=="object"||
     Array.isArray(data.answers))return response({code:"INVALID_PAYLOAD"},400);
  id=data.instrumentId;answers=data.answers as Record<string,number>;
 }catch{return response({code:"INVALID_PAYLOAD"},400);}
 const instrument=getInstrument(id);
 if(!instrument)return response({code:"UNKNOWN_INSTRUMENT"},404);
 try{
  const allowed=await hasVerifiedItemEntitlement(account.id,"report",id);
  if(!allowed)return response({code:"PREMIUM_REPORT_REQUIRES_VERIFIED_PAYMENT"},403);
 }catch{return response({code:"ENTITLEMENT_CHECK_UNAVAILABLE"},503);}
 try{
  const detailed=buildDetailedReport(instrument,answers);
  return response({report:detailed},200);
 }catch{return response({code:"INVALID_OR_INCOMPLETE_ANSWERS"},400);}
}
