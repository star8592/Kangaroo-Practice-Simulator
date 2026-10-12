import {NextRequest,NextResponse} from "next/server";
import {createFamilyPracticeSessionToken,createSessionToken,publicUserById,SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
import {familyOwnsStudent} from "@/lib/family-store";
import {trustedFamilyActionOrigin} from "@/lib/family-origin";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";

export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
function parent(req:NextRequest){return parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value)}
function authorizedOrigin(req:NextRequest){
 return trustedFamilyActionOrigin(req) &&
   req.headers.get("content-type")?.toLowerCase().startsWith("application/json")===true;
}

export async function GET(req:NextRequest){
 const adult=parent(req);
 if(!adult)return NextResponse.json({error:"请先用微信登录"},{status:401,headers:noStore});
 const active=userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
 return NextResponse.json({
  activeStudentId:active?.role==="student"&&active.candidateNo!=="GUEST"&&familyOwnsStudent(adult.id,active.id)?active.id:null,
  familyPractice:active?.id.startsWith("guest_family_")===true,
 },{headers:noStore});
}

export async function POST(req:NextRequest){
 const adult=parent(req);
 if(!adult)return NextResponse.json({error:"请先登录家庭账号"},{status:401,headers:noStore});
 if(!authorizedOrigin(req))
  return NextResponse.json({error:"请在本网站选择孩子"},{status:403,headers:noStore});
 try{
  const input=await req.json();
  if(!input || !Object.hasOwn(input,"studentId"))
   return NextResponse.json({error:"请选择孩子或家庭体验"},{status:400,headers:noStore});
  const studentId=input.studentId;
  let token:string;
  let student=null;
  if(studentId===null){
   token=createFamilyPracticeSessionToken(adult.id);
  }else if(typeof studentId==="string"&&/^stu_[0-9a-f]{16}$/.test(studentId) && familyOwnsStudent(adult.id,studentId)){
   student=publicUserById(studentId);
   if(!student || student.role!=="student")
    return NextResponse.json({error:"孩子档案已不可用"},{status:404,headers:noStore});
   token=createSessionToken(student.id);
  }else{
   return NextResponse.json({error:"无权使用这个孩子的学习档案"},{status:403,headers:noStore});
  }
  const result=NextResponse.json({
    ok:true,activeStudentId:student?.id||null,familyPractice:student===null,
  },{headers:noStore});
  const host=(req.headers.get("x-forwarded-host")||req.headers.get("host")||req.nextUrl.hostname).split(":")[0].toLowerCase();
  const productionSite=host==="socthink.cn"||host.endsWith(".socthink.cn");
  if(productionSite){
   // Remove an old host-only learner cookie BEFORE installing the canonical
   // domain cookie. This prevents duplicate names after guest/legacy login.
   result.headers.append("Set-Cookie",[
    SESSION_COOKIE+"=","Path=/","Max-Age=0","HttpOnly","SameSite=Strict","Secure",
   ].join("; "));
   // Append both headers explicitly: NextResponse.cookies.set() otherwise
   // overwrites the preceding legacy-expiration Set-Cookie header.
   result.headers.append("Set-Cookie",[
    SESSION_COOKIE+"="+encodeURIComponent(token),"Path=/","Domain=.socthink.cn",
    "Max-Age=604800","HttpOnly","SameSite=Strict","Secure",
   ].join("; "));
  }else{
   result.cookies.set(SESSION_COOKIE,token,{
    httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production"||req.nextUrl.protocol==="https:",path:"/",maxAge:604800,
   });
  }
  return result;
 }catch{
  return NextResponse.json({error:"切换失败，请重试"},{status:400,headers:noStore});
 }
}
