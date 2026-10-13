import {NextRequest,NextResponse} from "next/server";
import {createParentSessionToken,parentFromSessionToken,PARENT_SESSION_COOKIE,PARENT_SESSION_TTL_SECONDS} from "@/lib/parent-auth";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const u=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!u)return NextResponse.json({error:"not logged in"},{status:401,headers:{"Cache-Control":"no-store"}});
 const r=NextResponse.json({user:u},{headers:{"Cache-Control":"no-store"}});
 r.cookies.set(PARENT_SESSION_COOKIE,createParentSessionToken(u.id),{
  httpOnly:true,sameSite:"strict",secure:req.nextUrl.protocol==="https:",path:"/",
  domain:req.nextUrl.hostname==="socthink.cn"||req.nextUrl.hostname.endsWith(".socthink.cn")?".socthink.cn":undefined,
  maxAge:PARENT_SESSION_TTL_SECONDS,
 });
 return r;
}
