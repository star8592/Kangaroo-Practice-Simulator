import type {NextRequest} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "./parent-auth";

/** Paid model access is website WeChat only: never trust Browser IDs or Miniapp Bearer. */
export function verifiedInterviewBuyer(req:NextRequest):string|null{
 if(req.headers.get("authorization"))return null;
 const cookie=req.cookies.get(PARENT_SESSION_COOKIE)?.value;
 if(!cookie)return null;
 const buyer=parentFromSessionToken(cookie);
 return buyer?.active&&(buyer.wechatId||buyer.wechatOpenId)?buyer.id:null;
}
export function validCareerOrigin(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin||req.headers.get("sec-fetch-site")==="cross-site")return false;
 try{
  const u=new URL(origin);
  // Reject hostile HTTP origins on production even when reverse-proxy Host is spoofed.
  const canonical=process.env.SOCTHINK_PUBLIC_ORIGIN?.trim();
  if(canonical)return u.origin===canonical;
  return u.origin===req.nextUrl.origin ||
    (u.host===req.headers.get("host")&&["localhost","127.0.0.1"].includes(u.hostname));
 }catch{return false;}
}
