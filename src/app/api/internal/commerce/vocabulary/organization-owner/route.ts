import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {backendKeyMatches,englishSsoSubject} from "@/lib/english-sso-ticket";
import {activePlatformGrants} from "@/lib/platform-grants";
import {attestVerifiedOrganizationOwner,billingConfigured,BillingConflictError} from "@/lib/billing-ledger";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(data:object,status:number)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req:NextRequest){
  // The independent Vocabulary backend attests current local OWNER membership.
  // A browser cannot mint this attestation or supply arbitrary parent IDs.
  if(req.headers.has("origin")||
     !req.headers.get("content-type")?.startsWith("application/json"))
    return response({code:"SERVER_ONLY"},403);
  const key=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1]??"";
  if(!backendKeyMatches("vocabulary",key))return response({code:"UNAUTHORIZED_BACKEND"},401);
  const buyer=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if(!buyer?.active||!(buyer.wechatId||buyer.wechatOpenId))
    return response({code:"WECHAT_SESSION_EXPIRED"},401);
  const raw=await req.text();
  if(raw.length>384)return response({code:"BAD_REQUEST"},400);
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return response({code:"BAD_REQUEST"},400);}
  const o=input&&typeof input==="object"&&!Array.isArray(input)?input as Record<string,unknown>:null;
  if(!o||typeof o.organizationId!=="string"||!uuid.test(o.organizationId)||
    typeof o.centralSubject!=="string"||
    o.centralSubject!==englishSsoSubject("vocabulary",buyer.id))
    return response({code:"SUBJECT_OR_ORG_MISMATCH"},403);
  if(!billingConfigured())return response({code:"BILLING_UNAVAILABLE"},503);
  try{
    const grants=await activePlatformGrants(buyer.id);
    if(!grants.some(g=>g.capability==="english.vocabulary"&&g.scopeKind==="product"&&
      (g.role==="teacher"||g.role==="module-admin")))
      return response({code:"PLATFORM_VOCABULARY_GRANT_REQUIRED"},403);
    const verified=await attestVerifiedOrganizationOwner({
      buyerParentId:buyer.id,organizationId:o.organizationId,verifiedSubject:o.centralSubject,
    });
    return response({organizationId:verified.organizationId,validForSeconds:verified.validForSeconds},200);
  }catch(error){
    if(error instanceof BillingConflictError)return response({code:"ORGANIZATION_BINDING_CONFLICT"},409);
    return response({code:"ORG_ATTESTATION_UNAVAILABLE"},503);
  }
}
