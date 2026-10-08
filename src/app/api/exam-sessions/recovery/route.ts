import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { hasFullExamAccess } from "@/lib/exam-access";
import { ownedExamSession } from "@/lib/exam-session";
import { recoveredExamResult } from "@/lib/exam-submit-recovery";

/** Recover a committed result after a lost HTTP response, with no new sitting. */
export async function GET(req:NextRequest){
  const user=userFromRequest(req);
  if(!hasFullExamAccess(user))return NextResponse.json({error:"请先登录正式考生账号"},{status:401});
  const examId=req.nextUrl.searchParams.get("examId")||"";
  const sessionId=req.nextUrl.searchParams.get("sessionId")||"";
  if(!examId||!sessionId)return NextResponse.json({error:"缺少考试会话信息"},{status:400});
  const session=ownedExamSession(sessionId,user.id,examId);
  if(!session)return NextResponse.json({error:"考试会话不存在"},{status:404});
  try{
    const result=recoveredExamResult(user.id,examId,sessionId);
    if(result)return NextResponse.json({status:"completed",result});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"无法恢复成绩"},{status:503});
  }
  return NextResponse.json({status:session.expiresAt>Date.now()?"active":"expired"});
}
