import {NextRequest,NextResponse} from "next/server";
import {billingConfigured,billingPool} from "@/lib/billing-ledger";
import {getConfig} from "@/lib/career-model-routing";
import {getInterviewProfile} from "@/lib/career-interview-scenarios";
import {verifiedInterviewBuyer} from "@/lib/career-interview-security";
import {getPaidCareerSessionAvailability} from "@/lib/career-service-ledger";
import {nativeCheckoutAllowed,nativeCheckoutAllowedForBuyer} from "@/lib/wechat-native-flags";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization","X-Robots-Tag":"noindex"};
const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers});
export async function GET(req:NextRequest){
 const profileId=req.nextUrl.searchParams.get("profileId")||"";
 if(!getInterviewProfile(profileId))return reply({code:"PROFILE_NOT_FOUND"},404);
 const buyerId=verifiedInterviewBuyer(req);
 const loggedIn=Boolean(buyerId);
 // Never leak pilot-only prices or pretend a model-enabled product exists when checkout is disabled.
 if(!billingConfigured() || !getConfig() || process.env.SOCTHINK_CAREER_AI_BILLING_ENABLED!=="1")
  return reply({available:false,loggedIn,offers:[],reason:"CAREER_SERVICE_NOT_PUBLISHED"});
 try{
  const entitlement=buyerId?await getPaidCareerSessionAvailability(buyerId,profileId):null;
  const offers=await billingPool().query<{
   id:string;title_zh:string;amount_minor:string;currency:string;
   service_sessions:number;service_billing_mode:string;
  }>(`SELECT id,title_zh,amount_minor::text,currency,service_sessions,service_billing_mode
     FROM billing_products WHERE product_kind='service' AND content_kind='career_interview'
       AND content_id=$1 AND enabled=true AND rights_approved=true
       AND delivery_verified=true AND access_restricted=true
       AND currency='CNY' AND amount_minor>0
       AND service_billing_mode IN ('monthly','per_use')
     ORDER BY CASE service_billing_mode WHEN 'per_use' THEN 0 ELSE 1 END,amount_minor,id`,[profileId]);
  const published=offers.rows.filter(x=>nativeCheckoutAllowedForBuyer(buyerId,x.id))
   .filter(x=>Number.isSafeInteger(Number(x.amount_minor))&&Number(x.amount_minor)>0
     &&Number.isInteger(x.service_sessions)&&x.service_sessions>=1
     &&x.service_sessions<=(x.service_billing_mode==="monthly"?60:20))
   .map(x=>({kind:"service" as const,id:x.id,titleZh:x.title_zh,
    contentKind:"career_interview" as const,contentId:profileId,
    billingMode:x.service_billing_mode as "monthly"|"per_use",sessions:x.service_sessions,
    priceMinor:Number(x.amount_minor),currency:"CNY" as const}));
  return reply({available:published.length>0,loggedIn,offers:published,
   ...(entitlement?{remainingSessions:entitlement.remainingSessions,
    perUseRemaining:entitlement.perUseRemaining,monthlyRemaining:entitlement.monthlyRemaining,
    monthlyActiveUntil:entitlement.monthlyActiveUntil,
    activeSessions:entitlement.activeSessions}:{}),
   reason:published.length?null:(nativeCheckoutAllowed()?"NO_VERIFIED_SKU":"CHECKOUT_NOT_ENABLED")});
 }catch{return reply({available:false,loggedIn,offers:[],reason:"ENTITLEMENT_OR_CATALOG_UNAVAILABLE"},503);}
}
