import {NextRequest,NextResponse} from "next/server";
import {createFamilyChildSessionToken,SESSION_COOKIE,publicUserById} from "@/lib/auth";
import {familyOwnsStudent} from "@/lib/family-store";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";

export const dynamic="force-dynamic";

/** Defend a state-changing family session switch from sibling-origin requests. */
function sameOrigin(req:NextRequest){
 const origin=req.headers.get("origin");
 const host=(req.headers.get("x-forwarded-host")||req.headers.get("host")||req.nextUrl.host).split(",")[0].trim();
 const protocol=(req.headers.get("x-forwarded-proto")||req.nextUrl.protocol.replace(":","")).split(",")[0].trim();
 return Boolean(origin&&origin===protocol+"://"+host&&req.headers.get("sec-fetch-site")!=="cross-site");
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"请从本站家庭中心操作"},{status:403});
 const p=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!p)return NextResponse.json({error:"家庭会话已过期，请重新登录"},{status:401});
 const body=await req.json().catch(()=>null);
 const studentId=typeof body?.studentId==="string"?body.studentId:"";
 if(studentId.length===0||studentId.length>128||!familyOwnsStudent(p.id,studentId)){
  return NextResponse.json({error:"该孩子不属于当前家庭"},{status:403});
 }
 const student=publicUserById(studentId);
 if(!student||student.role!=="student")return NextResponse.json({error:"孩子档案已停用或不存在"},{status:403});
 const response=NextResponse.json({ok:true,student:{id:student.id,name:student.name,grade:student.grade}},{
  headers:{"Cache-Control":"no-store"},
 });
 const forwardedHost=(req.headers.get("x-forwarded-host")||req.headers.get("host")||req.nextUrl.hostname).split(",")[0].trim();
 const requestHostname=forwardedHost.replace(/:\d+$/,"");
 const isPublicHost=requestHostname==="socthink.cn"||requestHostname.endsWith(".socthink.cn");
 const https=req.nextUrl.protocol==="https:"||req.headers.get("x-forwarded-proto")==="https";
 response.cookies.set(SESSION_COOKIE,createFamilyChildSessionToken(p.id,student.id),{
  httpOnly:true,sameSite:"strict",secure:https,path:"/",maxAge:604800,
  domain:isPublicHost?".socthink.cn":undefined,
 });
 return response;
}
