import crypto from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {userFromRequest} from "@/lib/auth";
import {getCareerPractice} from "@/lib/career-practice";
import {gradeCareerPractice} from "@/lib/career-practice-grade";
import {
  CareerAttemptConflictError,isValidCareerAttemptId,
  isVerifiedCareerStudyIdentity,recordCareerAttempt,
} from "@/lib/career-attempt-store";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const PRIVATE={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization"};

type RouteContext={params:Promise<{id:string}>};

/** Free grading for all visitors; durable history is a verified WeChat-user
 * enhancement. We never accept an owner ID or score from the request body.
 */
export async function POST(req:NextRequest,{params}:RouteContext){
  const {id}=await params;
  const practice=getCareerPractice(id);
  if(!practice||practice.deliveryState!=="free-live-preview")
    return NextResponse.json({error:"未找到已开放的职业实操案例",code:"CASE_NOT_FOUND"},
      {status:404,headers:PRIVATE});
  const type=req.headers.get("content-type")||"";
  if(!type.toLowerCase().startsWith("application/json"))
    return NextResponse.json({error:"请求格式必须为 JSON",code:"INVALID_CONTENT_TYPE"},
      {status:415,headers:PRIVATE});
  const length=Number(req.headers.get("content-length")||0);
  if(length>8192)
    return NextResponse.json({error:"答案内容超过限制",code:"ANSWERS_TOO_LARGE"},
      {status:413,headers:PRIVATE});
  try{
    const text=await req.text();
    if(Buffer.byteLength(text,"utf8")>8192)
      return NextResponse.json({error:"答案内容超过限制",code:"ANSWERS_TOO_LARGE"},
        {status:413,headers:PRIVATE});
    const value=JSON.parse(text) as {answers?:unknown;attemptId?:unknown};
    if(!value||typeof value!=="object"||Array.isArray(value))
      throw Error("INVALID_BODY");
    const grade=gradeCareerPractice(id,value.answers);
    if(!grade)return NextResponse.json({error:"案例不存在"},{status:404,headers:PRIVATE});

    const user=userFromRequest(req);
    if(!isVerifiedCareerStudyIdentity(user)){
      return NextResponse.json({grade,saveStatus:"browser-only" as const},
        {status:200,headers:PRIVATE});
    }

    if(value.attemptId!==undefined&&!isValidCareerAttemptId(value.attemptId))
      return NextResponse.json({error:"本次交卷编号无效",code:"INVALID_ATTEMPT_ID"},
        {status:400,headers:PRIVATE});
    const attemptId=value.attemptId??crypto.randomUUID();
    try{
      const saved=recordCareerAttempt({
        ownerId:user.id,
        attemptId:attemptId as string,
        caseId:id,
        title:practice.title,
        revision:practice.revision,
        answers:value.answers as Record<string,string|string[]>,
        grade,
      });
      return NextResponse.json({
        grade:saved.record.grade,saveStatus:"saved" as const,
        attemptId:saved.record.summary.attemptId,
        submittedAt:saved.record.summary.submittedAt,
        alreadySaved:saved.alreadySaved,
      },{status:200,headers:PRIVATE});
    }catch(e){
      if(e instanceof CareerAttemptConflictError){
        return NextResponse.json({error:"这次交卷编号已用于另一份答卷，请重新提交",
          code:"ATTEMPT_ID_CONFLICT"},{status:409,headers:PRIVATE});
      }
      // Do not report an unsaved result as persisted. Scoring remains free
      // even if durable storage is briefly unavailable.
      return NextResponse.json({
        grade,saveStatus:"failed" as const,
        warning:"本次已完成评分，但账号成绩保存失败；请保存结果并稍后重新提交。",
      },{status:200,headers:PRIVATE});
    }
  }catch(e){
    if(e instanceof Error&&/^(ANSWERS_|UNKNOWN_QUESTION|MULTIPLE_CHOICE_|ANSWER_|INVALID_BODY)/.test(e.message)||
      e instanceof SyntaxError){
      return NextResponse.json({error:"答案格式无效，请检查后重试",code:"INVALID_ANSWERS"},
        {status:400,headers:PRIVATE});
    }
    return NextResponse.json({error:"评分服务暂时不可用",code:"GRADE_UNAVAILABLE"},
      {status:503,headers:PRIVATE});
  }
}
