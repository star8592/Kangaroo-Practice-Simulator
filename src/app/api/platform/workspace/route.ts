import {NextRequest} from "next/server";
import {currentWechatUser,answer,platformFailure} from "@/lib/platform-api";
import {myAuthorizedModules} from "@/lib/platform-grants";
import {isSiteOwner} from "@/lib/site-owner";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 try{
  const me=currentWechatUser(req);
  const modules=await myAuthorizedModules(me.id);
  return answer({modules,siteOwner:isSiteOwner(me)});
 }catch(e){return platformFailure(e)}
}
