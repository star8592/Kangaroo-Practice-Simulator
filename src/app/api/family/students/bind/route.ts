import {NextRequest,NextResponse} from "next/server";
import {authenticate} from "@/lib/auth";
import {addStudentToFamily,familyOwnsStudent} from "@/lib/family-store";
import {trustedFamilyActionOrigin} from "@/lib/family-origin";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {checkLoginLimit,clearLoginFailures,loginKey,recordLoginFailure} from "@/lib/login-rate-limit";

const noStore={"Cache-Control":"no-store"};
export async function POST(req:NextRequest){
 const parent=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
 if(!parent)return NextResponse.json({error:"请先登录家庭账号"},{status:401,headers:noStore});
 if(!trustedFamilyActionOrigin(req)||!req.headers.get("content-type")?.startsWith("application/json"))
  return NextResponse.json({error:"请在本网站绑定已有学生账号"},{status:403,headers:noStore});
 try{
  const body=await req.json();
  const account=String(body?.username||"").trim(),pin=String(body?.pin||"");
  if(account.length<1||account.length>128||!/^\d{4,12}$/.test(pin))
   return NextResponse.json({error:"请填写已有学生账号与 PIN"},{status:400,headers:noStore});
  const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"local").split(",")[0].trim();
  const key=loginKey(account,ip),limit=checkLoginLimit(key);
  if(!limit.allowed)return NextResponse.json({error:"尝试次数过多，请稍后再试"},{status:429,headers:{...noStore,"Retry-After":String(limit.retryAfterSeconds)}});
  const student=authenticate(account,pin);
  if(!student||student.role!=="student"){
   const failed=recordLoginFailure(key);
   if(failed.blockedUntil>Date.now())return NextResponse.json({error:"尝试次数过多，请稍后再试"},{status:429,headers:{...noStore,"Retry-After":String(Math.ceil((failed.blockedUntil-Date.now())/1000))}});
   return NextResponse.json({error:"已有学生账号或 PIN 不正确"},{status:401,headers:noStore});
  }
  clearLoginFailures(key);
  if(!familyOwnsStudent(parent.id,student.id)){
   try{addStudentToFamily(parent.id,student.id)}
   catch{return NextResponse.json({error:"此学生已关联其他家庭，请联系管理员协助核验"},{status:409,headers:noStore})}
  }
  return NextResponse.json({ok:true,student:{id:student.id,name:student.name,grade:student.grade}},{headers:noStore});
 }catch{
  return NextResponse.json({error:"绑定失败，请重试"},{status:400,headers:noStore});
 }
}
