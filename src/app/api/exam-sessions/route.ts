import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { hasFullExamAccess } from "@/lib/exam-access";
import { deniedItemExamResponse } from "@/lib/item-access-server";
import { isExamBundleTrainingReady, loadTrainingExamBundle } from "@/lib/training-question-bank";
import { isCommercialMockExamReady } from "@/lib/exam-service-policy";
import {
  activeExamSession,
  cancelExamSession,
  lockExamSection,
  saveExamSectionDraft,
  startExamSection,
  startExamSession,
  validateExamSession,
} from "@/lib/exam-session";
import {
  getExamEntitlementForSession,
  getExamEntitlementSummary,
  isCommerceExamUser,
  reserveExamEntitlement,
} from "@/lib/exam-entitlement-store";

const user = (request: NextRequest) => userFromRequest(request);

function reservationError(reason: string, summary: ReturnType<typeof getExamEntitlementSummary>) {
  const status = reason === "exam_not_included" || reason === "competition_not_included" ? 403 : reason === "no_exam_credit" ? 402 : 409;
  const messages: Record<string, string> = {
    competition_not_included: "本次考试权益不包含该竞赛类别",
    exam_not_included: "本次订单未购买此年份或场次试卷",
    no_exam_credit: "本次模拟考试权益已用完",
    exam_in_progress: "已有一场模拟考试正在进行，请先完成或等待本场结束",
    reservation_conflict: "考试权益与当前考试会话不匹配，请重新进入考试",
  };
  return NextResponse.json({ error: messages[reason] || "无法锁定考试权益", entitlement: summary }, { status });
}

export async function GET(request: NextRequest) {
  const currentUser = user(request);
  if (!hasFullExamAccess(currentUser)) return NextResponse.json({ error: "请先登录考生账号" }, { status: 401 });
  const examId = request.nextUrl.searchParams.get("examId") || "";
  if (!examId) return NextResponse.json({ error: "missing examId" }, { status: 400 });
  try {
    const denied = await deniedItemExamResponse(request, examId);
    if (denied) return denied;
    const bundle = loadTrainingExamBundle(examId);
    if (!isExamBundleTrainingReady(bundle)) return NextResponse.json({ error: "Exam is not training-ready" }, { status: 404 });
    const session = activeExamSession(currentUser.id, examId);
    if (!isCommercialMockExamReady(bundle.profile)) return NextResponse.json({ session, serverNow: Date.now() });
    if (!isCommerceExamUser(currentUser.id)) return reservationError("no_exam_credit", getExamEntitlementSummary(currentUser.id));

    const summary = getExamEntitlementSummary(currentUser.id);
    if (session) {
      let entitlement = getExamEntitlementForSession(currentUser.id, session.id);
      if (!entitlement) {
        const reserved = reserveExamEntitlement({
          userId: currentUser.id,
          sessionId: session.id,
          examId,
          competitionId: bundle.profile.competitionId || "",
          expiresAt: session.expiresAt,
        });
        if (!reserved.ok) return reservationError(reserved.reason, summary);
        entitlement = reserved.entitlement;
      }
      if (entitlement.reservedExamId !== examId || !["reserved", "submitting"].includes(entitlement.status)) {
        return NextResponse.json({ error: "当前考试没有有效权益锁定", entitlement: summary }, { status: 409 });
      }
    }
    return NextResponse.json({ session, entitlement: summary, remainingAttempts: summary.available });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法读取考试会话" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = user(request);
    if (!hasFullExamAccess(currentUser)) return NextResponse.json({ error: "请先登录考生账号" }, { status: 401 });
    const body = await request.json();
    const examId = String(body?.examId || "");
    const denied = await deniedItemExamResponse(request, examId);
    if (denied) return denied;
    const bundle = loadTrainingExamBundle(examId);
    if (!isExamBundleTrainingReady(bundle)) return NextResponse.json({ error: "Exam is not training-ready" }, { status: 404 });

    const started = startExamSession(currentUser.id, examId, bundle.profile.durationSeconds, bundle.profile.timingSections);
    if (!isCommercialMockExamReady(bundle.profile)) {
      return NextResponse.json({ ...started, serverNow: Date.now(), durationSeconds: bundle.profile.durationSeconds });
    }
    if (!isCommerceExamUser(currentUser.id)) {
      if (!started.resumed) cancelExamSession(started.session.id, currentUser.id, examId);
      return reservationError("no_exam_credit", getExamEntitlementSummary(currentUser.id));
    }

    const reserved = reserveExamEntitlement({
      userId: currentUser.id,
      sessionId: started.session.id,
      examId,
      competitionId: bundle.profile.competitionId || "",
      expiresAt: started.session.expiresAt,
    });
    if (!reserved.ok) {
      if (!started.resumed) cancelExamSession(started.session.id, currentUser.id, examId);
      return reservationError(reserved.reason, getExamEntitlementSummary(currentUser.id));
    }
    const entitlement = getExamEntitlementSummary(currentUser.id);
    return NextResponse.json({
      ...started,
      serverNow: Date.now(),
      durationSeconds: bundle.profile.durationSeconds,
      entitlement,
      remainingAttempts: entitlement.available,
      creditIndex: reserved.entitlement.creditIndex,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法创建考试会话" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = user(request);
    if (!hasFullExamAccess(currentUser)) return NextResponse.json({ error: "请先登录考生账号" }, { status: 401 });
    const body = await request.json();
    const examId = String(body?.examId || "");
    const sessionId = String(body?.sessionId || "");
    const action = String(body?.action || "");
    const denied = await deniedItemExamResponse(request, examId);
    if (denied) return denied;
    const bundle = loadTrainingExamBundle(examId);
    if (!isExamBundleTrainingReady(bundle)) return NextResponse.json({ error: "Exam is not training-ready" }, { status: 404 });

    const valid = validateExamSession(sessionId, currentUser.id, examId);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 409 });
    if (isCommercialMockExamReady(bundle.profile)) {
      const entitlement = getExamEntitlementForSession(currentUser.id, sessionId);
      if (!entitlement || entitlement.reservedExamId !== examId || !["reserved", "submitting"].includes(entitlement.status)) {
        return NextResponse.json({ error: "没有本场考试的有效权益，请检查剩余次数", entitlement: getExamEntitlementSummary(currentUser.id) }, { status: 402 });
      }
    }

    const sections = bundle.profile.timingSections || [];
    if (!sections.length) return NextResponse.json({ error: "该考试不是分段计时赛制" }, { status: 400 });
    const index = Number(body?.sectionIndex);
    if (!Number.isInteger(index) || index < 0 || index >= sections.length) {
      return NextResponse.json({ error: "无效的考试部分" }, { status: 400 });
    }
    if (action === "start-section") {
      const session = startExamSection({ id: sessionId, userId: currentUser.id, examId, sectionIndex: index });
      return NextResponse.json({ session, serverNow: Date.now() });
    }
    if (action === "save-section") {
      const section = sections[index];
      const questionIds = bundle.questions.filter(question => question.questionNo >= section.questionStart && question.questionNo <= section.questionEnd).map(question => question.id);
      const answers = (body?.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, string>;
      const session = saveExamSectionDraft({ id: sessionId, userId: currentUser.id, examId, sectionIndex: index, answers, questionIds, durationSeconds: section.durationSeconds });
      return NextResponse.json({ session, serverNow: Date.now() });
    }
    if (action === "lock-section") {
      const section = sections[index];
      const questionIds = bundle.questions.filter(question => question.questionNo >= section.questionStart && question.questionNo <= section.questionEnd).map(question => question.id);
      const answers = (body?.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, string>;
      const session = lockExamSection({ id: sessionId, userId: currentUser.id, examId, sectionIndex: index, answers, questionIds, durationSeconds: section.durationSeconds });
      return NextResponse.json({ session, finalSection: index === sections.length - 1 });
    }
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "无法更新考试会话" }, { status: 409 });
  }
}
