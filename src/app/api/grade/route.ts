import { NextRequest, NextResponse } from "next/server";
import { gradeExam } from "@/lib/grading";
import { isExamBundleTrainingReady, loadTrainingExamBundle } from "@/lib/training-question-bank";
import { isCommercialMockExamReady } from "@/lib/exam-service-policy";
import { userFromRequest } from "@/lib/auth";
import { hasFullExamAccess } from "@/lib/exam-access";
import { deniedItemExamResponse } from "@/lib/item-access-server";
import {
  appendExamAttempt,
  findExamAttemptBySession,
  withExamSubmitLock,
  type ExamEvent,
} from "@/lib/attempt-store";
import {
  activeSectionElapsedSeconds,
  allExamSectionsLocked,
  completeExamSession,
  lockedExamAnswers,
  validateExamSession,
} from "@/lib/exam-session";
import {
  beginExamEntitlementSubmission,
  consumeExamEntitlement,
  getExamEntitlementForSession,
  getExamEntitlementSummary,
  isCommerceExamUser,
  restoreExamEntitlementSubmission,
} from "@/lib/exam-entitlement-store";

function events(value: unknown, start: number, end: number): ExamEvent[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-5000).flatMap(raw => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    if (typeof row.type !== "string") return [];
    const n = Number(row.at);
    const event: ExamEvent = {
      type: row.type.slice(0, 60),
      at: Number.isFinite(n) ? Math.max(start, Math.min(end, n)) : end,
    };
    if (typeof row.questionId === "string") event.questionId = row.questionId.slice(0, 120);
    if (typeof row.value === "string") event.value = row.value.slice(0, 80);
    return [event];
  });
}

function entitlementRequired() {
  return NextResponse.json({ error: "本场考试没有有效次数，请返回考试目录检查剩余权益" }, { status: 402 });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = userFromRequest(request);
    if (!hasFullExamAccess(currentUser)) return NextResponse.json({ error: "请先登录正式考生账号" }, { status: 401 });
    const body = await request.json();
    const examId = String(body?.examId || "");
    const sessionId = String(body?.sessionId || "");
    if (!examId || !sessionId) return NextResponse.json({ error: "缺少考试或会话标识" }, { status: 400 });

    const denied = await deniedItemExamResponse(request, examId);
    if (denied) return denied;
    const bundle = loadTrainingExamBundle(examId);
    if (!isExamBundleTrainingReady(bundle)) return NextResponse.json({ error: "Exam is not training-ready" }, { status: 404 });
    const paidExam = isCommercialMockExamReady(bundle.profile);
    if (paidExam && !isCommerceExamUser(currentUser.id)) return entitlementRequired();
    const commerceUser = paidExam && isCommerceExamUser(currentUser.id);
    if (commerceUser) {
      const entitlement = getExamEntitlementForSession(currentUser.id, sessionId);
      if (!entitlement || entitlement.reservedExamId !== examId
        || !["reserved", "submitting", "consumed"].includes(entitlement.status)) return entitlementRequired();
    }

    const result = withExamSubmitLock(currentUser.id, examId, sessionId, () => {
      const valid = validateExamSession(sessionId, currentUser.id, examId);
      const existing = findExamAttemptBySession(currentUser.id, sessionId);
      if (existing) {
        if (commerceUser) {
          const entitlement = getExamEntitlementForSession(currentUser.id, sessionId);
          if (!entitlement || entitlement.reservedExamId !== examId) throw new Error("EXAM_ENTITLEMENT_RESERVATION_REQUIRED");
          if (entitlement.status !== "consumed") {
            consumeExamEntitlement({ userId: currentUser.id, sessionId, attemptId: existing.id, now: existing.submittedAt });
          } else if (entitlement.attemptId !== existing.id) {
            throw new Error("EXAM_ENTITLEMENT_ATTEMPT_CONFLICT");
          }
        }
        completeExamSession(sessionId, existing.id, existing.submittedAt);
        return {
          ...existing.grade,
          attemptId: existing.id,
          elapsedSeconds: existing.elapsedSeconds,
          submittedAt: existing.submittedAt,
          entitlement: commerceUser ? getExamEntitlementSummary(currentUser.id) : undefined,
          remainingAttempts: commerceUser ? getExamEntitlementSummary(currentUser.id).available : undefined,
        };
      }
      if (!valid.ok) throw new Error(valid.error);
      if (commerceUser) {
        const entitlement = getExamEntitlementForSession(currentUser.id, sessionId);
        if (!entitlement || entitlement.reservedExamId !== examId || !["reserved", "submitting"].includes(entitlement.status)) {
          throw new Error("EXAM_ENTITLEMENT_RESERVATION_REQUIRED");
        }
        if (entitlement.status === "reserved") beginExamEntitlementSubmission(currentUser.id, sessionId);
      }

      const sections = bundle.profile.timingSections || [];
      let effectiveAnswers = (body?.answers || {}) as Record<string, string>;
      if (sections.length) {
        if (!allExamSectionsLocked(valid.session, sections.length)) throw new Error("请先完成并锁定所有考试部分");
        effectiveAnswers = lockedExamAnswers(valid.session);
      }

      const grade = gradeExam(bundle.questions, effectiveAnswers, bundle.profile, body?.lang === "en" ? "en" : "zh");
      const submittedAt = Date.now();
      const elapsedSeconds = sections.length
        ? activeSectionElapsedSeconds(valid.session, sections)
        : bundle.profile.timingMode === "untimed"
          ? Math.max(0, Math.round((submittedAt - valid.session.startedAt) / 1000))
          : Math.min(bundle.profile.durationSeconds, Math.max(0, Math.round((submittedAt - valid.session.startedAt) / 1000)));
      const examEvents = events(body?.events, valid.session.startedAt, submittedAt);
      examEvents.push({ type: "server_submit", at: submittedAt });

      try {
        const attempt = appendExamAttempt({
          user: currentUser,
          bundle,
          grade,
          events: examEvents,
          startedAt: valid.session.startedAt,
          submittedAt,
          elapsedSeconds,
          sessionId,
        });
        if (commerceUser) consumeExamEntitlement({ userId: currentUser.id, sessionId, attemptId: attempt.id, now: submittedAt });
        completeExamSession(sessionId, attempt.id, submittedAt);
        const entitlement = commerceUser ? getExamEntitlementSummary(currentUser.id) : undefined;
        return {
          ...attempt.grade,
          attemptId: attempt.id,
          elapsedSeconds: attempt.elapsedSeconds,
          submittedAt: attempt.submittedAt,
          entitlement,
          remainingAttempts: entitlement?.available,
        };
      } catch (error) {
        if (commerceUser && !findExamAttemptBySession(currentUser.id, sessionId)) {
          restoreExamEntitlementSubmission(currentUser.id, sessionId);
        }
        throw error;
      }
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to grade exam";
    const status = message === "EXAM_ENTITLEMENT_RESERVATION_REQUIRED" ? 402
      : message === "EXAM_SUBMIT_BUSY" ? 500
      : message.includes("已经交卷") || message.includes("考试会话") ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
