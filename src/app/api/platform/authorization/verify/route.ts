/**
 * Backend-only capability verification for gradual product federation.
 * Returning a product-scoped pseudonym, never raw parent/WeChat IDs.
 * This endpoint is independent of public workspace discovery.
 */
import {NextRequest} from "next/server";
import {answer} from "@/lib/platform-api";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {backendKeyMatches,englishSsoSubject,isEnglishSsoProduct} from "@/lib/english-sso-ticket";
import {activePlatformGrants} from "@/lib/platform-grants";

export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(req.headers.has("origin")||
    !req.headers.get("content-type")?.startsWith("application/json"))
  return answer({code:"SERVER_ONLY"},403);
 const raw=await req.text();
 if(raw.length>256)return answer({code:"BAD_REQUEST"},400);
 let product:unknown;
 try{product=(JSON.parse(raw) as {product?:unknown}).product}
 catch{return answer({code:"BAD_REQUEST"},400)}
 if(!isEnglishSsoProduct(product))return answer({code:"INVALID_PRODUCT"},400);
 const secret=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1]||"";
 if(!backendKeyMatches(product,secret))return answer({code:"UNAUTHORIZED_BACKEND"},401);
 const u=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!u?.active||!(u.wechatId||u.wechatOpenId))
  return answer({code:"WECHAT_SESSION_EXPIRED"},401);
 try{
  const grants=await activePlatformGrants(u.id);
  const capability="english."+product;
  const authorized=grants.some(g=>g.capability===capability&&
    g.scopeKind==="product"&&(g.role==="teacher"||g.role==="module-admin"));
  return answer({product,subject:englishSsoSubject(product,u.id),authorized});
 }catch{return answer({code:"PLATFORM_AUTH_UNAVAILABLE"},503)}
}
