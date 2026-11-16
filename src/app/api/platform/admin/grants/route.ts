import {NextRequest} from "next/server";
import {siteOwnerOnly,answer,platformFailure,requirePlatformWriteOrigin} from "@/lib/platform-api";
import {activePlatformGrants,updatePlatformGrant,validatedGrantChange} from "@/lib/platform-grants";
import {platformWechatAccountById} from "@/lib/parent-auth";
import {PLATFORM_SUBJECT_PATTERN} from "@/lib/platform-capabilities";
export const dynamic="force-dynamic";
export const runtime="nodejs";

export async function GET(req:NextRequest){
 try{
  siteOwnerOnly(req);
  const subject=req.nextUrl.searchParams.get("subject")||"";
  if(!PLATFORM_SUBJECT_PATTERN.test(subject))return answer({error:"INVALID_SUBJECT"},400);
  const grants=await activePlatformGrants(subject);
  return answer({subject,grants});
 }catch(e){return platformFailure(e)}
}
export async function POST(req:NextRequest){
 try{
  const owner=siteOwnerOnly(req);
  requirePlatformWriteOrigin(req);
  const raw=await req.text();
  if(Buffer.byteLength(raw,"utf8")>2048)return answer({error:"BODY_TOO_LARGE"},413);
  let input:unknown;try{input=JSON.parse(raw)}catch{return answer({error:"INVALID_JSON"},400)}
  if(!input||typeof input!=="object"||Array.isArray(input))
    return answer({error:"INVALID_JSON"},400);
  const change=validatedGrantChange(input as Record<string,unknown>);
  // A manually entered ID must resolve to a VERIFIED, active platform WeChat user.
  // No new user is created by granting a module.
  if(!platformWechatAccountById(change.subject))
    return answer({error:"ACCOUNT_NOT_FOUND_OR_NOT_WECHAT"},404);
  const result=await updatePlatformGrant(owner.id,change);
  return answer({subject:change.subject,capability:change.capability,...result});
 }catch(e){return platformFailure(e)}
}
