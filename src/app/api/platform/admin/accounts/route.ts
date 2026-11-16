import {NextRequest} from "next/server";
import {siteOwnerOnly,answer,platformFailure} from "@/lib/platform-api";
import {searchWechatAccountsForOwner} from "@/lib/parent-auth";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 try{
  siteOwnerOnly(req);
  const q=req.nextUrl.searchParams.get("q")||"";
  if(q.length>80)return answer({error:"INVALID_QUERY"},400);
  return answer({users:searchWechatAccountsForOwner(q)});
 }catch(e){return platformFailure(e)}
}
