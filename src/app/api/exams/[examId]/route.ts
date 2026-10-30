import { NextRequest, NextResponse } from "next/server";
import { loadTrainingExamBundle, trainingQuestions } from "@/lib/training-question-bank";
import { userFromRequest } from "@/lib/auth";
import { hasFullExamAccess } from "@/lib/exam-access";
import { deniedItemExamResponse } from "@/lib/item-access-server";

export async function GET(r: NextRequest, c: {params: Promise<{examId:string}>}) {
  if (!hasFullExamAccess(userFromRequest(r)))
    return NextResponse.json({error:"请先登录正式考生账号"},{status:401});
  const {examId}=await c.params;
  const denied=await deniedItemExamResponse(r,examId);
  if(denied)return denied;
  try {
    const bundle=loadTrainingExamBundle(examId);
    if(bundle.profile.competitionId==="seamo" &&
       r.headers.get("authorization")?.startsWith("Bearer ") &&
       r.headers.get("x-socthink-miniapp-capabilities")!=="seamo-timer-v1")
      return NextResponse.json({error:"请更新微信小程序版本后再进行原生 SEAMO 训练，或使用网页版。"},{status:409});
    return NextResponse.json({profile:bundle.profile,questions:trainingQuestions(bundle.questions)});
  } catch (error) {
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to load exam"},{status:404});
  }
}
