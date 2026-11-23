import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
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
  if (!currentUser) return NextResponse.json({ error: "请先登录考生账号" }, { status: 401 });

  const { examId } = await context.params;
  try {
    const bundle = loadTrainingExamBundle(examId);
    if (isCommerceExamUser(currentUser.id) && isCommercialMockExamReady(bundle.profile)) {
      if (!hasAvailableExamCreditForExam(currentUser.id, examId)) {
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
