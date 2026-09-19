import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { loadVerifiedSolution } from "@/lib/solution-store";
import { hasSubmittedQuestion } from "@/lib/attempt-store";
import { activeExamSessionsForUser } from "@/lib/exam-session";
import { loadExamBundle } from "@/lib/question-bank";

function questionIsInActiveExam(userId:string,questionId:string){
  for(const session of activeExamSessionsForUser(userId)){
    try{
      const bundle=loadExamBundle(session.examId);
      if(bundle.questions.some(q=>q.id===questionId)) return true;
    }catch{}
  }
  return false;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ questionId: string }> },
) {
  const user = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { questionId } = await ctx.params;
  if (user.role !== "admin") {
    if (questionIsInActiveExam(user.id, questionId)) {
      return NextResponse.json({ error: "考试进行中，解析将在交卷后开放" }, { status: 423 });
    }
    if (!hasSubmittedQuestion(user.id, questionId)) {
      return NextResponse.json({ error: "请先完成并提交包含此题的考试" }, { status: 403 });
    }
  }

  const storyboard = loadVerifiedSolution(questionId);
  if (!storyboard) {
    return NextResponse.json({ error: "暂无已验证动画解析" }, { status: 404 });
  }
  return NextResponse.json(storyboard);
}
