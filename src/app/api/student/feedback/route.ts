import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { loadExamAttempts } from "@/lib/attempt-store";
import { FeedbackError, parseFeedbackInput, saveCustomerFeedback } from "@/lib/customer-feedback";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = userFromRequest(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.nextUrl.host) {
      return NextResponse.json({ error: "跨站提交不允许" }, { status: 403 });
    }
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "请使用JSON" }, { status: 415 });
    }
    const payload = await req.text();
    if (Buffer.byteLength(payload, "utf8") > 3000) {
      return NextResponse.json({ error: "反馈过长" }, { status: 413 });
    }
    const item = parseFeedbackInput(JSON.parse(payload));
    const attempt = loadExamAttempts(user.id, 500).find(x => x.id === item.attemptId);
    if (!attempt || attempt.examId !== item.examId) {
      return NextResponse.json({ error: "只能评价自己的考试" }, { status: 404 });
    }
    if (item.questionId && !attempt.questions.some(q => q.questionId === item.questionId)) {
      return NextResponse.json({ error: "该题不属于本次考试" }, { status: 400 });
    }
    const saved = saveCustomerFeedback(user.id, item);
    return NextResponse.json({ ok: true, feedbackId: saved.id, duplicate: saved.duplicate },
      { status: saved.duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof FeedbackError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof SyntaxError) return NextResponse.json({ error: "JSON格式无效" }, { status: 400 });
    console.error("customer_feedback_error", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "反馈未保存，请稍后重试" }, { status: 500 });
  }
}
