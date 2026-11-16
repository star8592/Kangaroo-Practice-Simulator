import {NextRequest,NextResponse} from "next/server";
import {backendKeyMatches} from "@/lib/english-sso-ticket";
import {billingConfigured,verifiedVocabularyOrganizationEntitlements} from "@/lib/billing-ledger";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(body:object,status:number)=>NextResponse.json(body,{
  status,headers:{"Cache-Control":"private, no-store, max-age=0"},
});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
  if(req.headers.has("origin")||
     !req.headers.get("content-type")?.startsWith("application/json"))
    return reply({code:"SERVER_ONLY"},403);
  const key=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1]??"";
  if(!backendKeyMatches("vocabulary",key))return reply({code:"UNAUTHORIZED_BACKEND"},401);
  const raw=await req.text();
  if(raw.length>256)return reply({code:"BAD_REQUEST"},400);
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return reply({code:"BAD_REQUEST"},400);}
  const o=input&&typeof input==="object"&&!Array.isArray(input)?input as Record<string,unknown>:null;
  if(!o||typeof o.organizationId!=="string"||!uuid.test(o.organizationId))
    return reply({code:"BAD_ORGANIZATION"},400);
  if(!billingConfigured())return reply({code:"BILLING_UNAVAILABLE"},503);
  try{
    const grants=await verifiedVocabularyOrganizationEntitlements(o.organizationId);
    return reply({product:"vocabulary",organizationId:o.organizationId,grants},200);
  }catch{return reply({code:"BILLING_UNAVAILABLE"},503)}
}
