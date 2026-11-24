import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { hasFullExamAccess } from "@/lib/exam-access";
import { deniedItemExamResponse } from "@/lib/item-access-server";
import { isCommercialMockExamReady } from "@/lib/exam-service-policy";
import {
  getActiveExamReservation,
  getExamEntitlementSummary,
  hasAvailableExamCreditForExam,
  isCommerceExamUser,
} from "@/lib/exam-entitlement-store";
import { loadTrainingExamBundle, trainingQuestions } from "@/lib/training-question-bank";

export async function GET(request: NextRequest, context: { params: Promise<{ examId: string }> }) {
  const currentUser = userFromRequest(request);
  if (!hasFullExamAccess(currentUser)) return NextResponse.json({ error: "请先登录考生账号" }, { status: 401 });

  const { examId } = await context.params;
  const denied = await deniedItemExamResponse(request, examId);
  if (denied) return denied;
  try {
    const bundle = loadTrainingExamBundle(examId);
    if(bundle.profile.competitionId==="seamo" &&
       request.headers.get("authorization")?.startsWith("Bearer ") &&
       request.headers.get("x-socthink-miniapp-capabilities")!=="seamo-timer-v1")
      return NextResponse.json({error:"请更新微信小程序版本后再进行原生 SEAMO 训练，或使用网页版。"},{status:409});
    if (isCommercialMockExamReady(bundle.profile)) {
      // Original paid papers are never available to an unrelated normal student.
      if (!isCommerceExamUser(currentUser.id) || !hasAvailableExamCreditForExam(currentUser.id, examId)) {
        return NextResponse.json({ error: "当前订单未购买这套年份／场次试卷", code: "EXAM_SKU_MISMATCH" }, { status: 403 });
      }
      const entitlement = getExamEntitlementSummary(currentUser.id);
      const active = getActiveExamReservation(currentUser.id);
      if (active && active.reservedExamId !== examId) {
        return NextResponse.json({
          error: "已有一场仿真考试正在进行，请先完成当前考试",
          code: "EXAM_IN_PROGRESS",
          entitlement,
        }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
      }
      if (!active && entitlement.available < 1) {
        return NextResponse.json({
          error: "本次仿真考试权益已用完，请购买后继续",
          code: "EXAM_CREDIT_REQUIRED",
          entitlement,
        }, { status: 402, headers: { "Cache-Control": "private, no-store" } });
      }
    }
    return NextResponse.json({
      profile: bundle.profile,
      questions: trainingQuestions(bundle.questions),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to load exam",
    }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
