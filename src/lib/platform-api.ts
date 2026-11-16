import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "./parent-auth";
import {isSiteOwner} from "./site-owner";
import {PlatformAuthError} from "./platform-grants";

export const noStore={"Cache-Control":"private, no-store, max-age=0"};
export function answer(data:object,status=200){return NextResponse.json(data,{status,headers:noStore})}
export function currentWechatUser(req:NextRequest){
 const user=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!user?.active||!(user.wechatId||user.wechatOpenId))
   throw new PlatformAuthError("WECHAT_LOGIN_REQUIRED",401);
 return user;
}
export function siteOwnerOnly(req:NextRequest){
 const user=currentWechatUser(req);
 if(!isSiteOwner(user))throw new PlatformAuthError("FORBIDDEN",403);
 return user;
}
export function requirePlatformWriteOrigin(req:NextRequest){
 const origin=req.headers.get("origin");
 const allowed=process.env.NODE_ENV==="development"
  ?["https://socthink.cn","http://127.0.0.1:4318","http://localhost:3000"]
  :["https://socthink.cn"];
 if(!origin||!allowed.includes(origin)||req.headers.get("sec-fetch-site")==="cross-site"||
    !req.headers.get("content-type")?.startsWith("application/json"))
   throw new PlatformAuthError("BAD_ORIGIN",403);
}
export function platformFailure(e:unknown){
 return answer({error:e instanceof PlatformAuthError?e.code:"PLATFORM_AUTH_UNAVAILABLE"},
  e instanceof PlatformAuthError?e.status:503);
}
