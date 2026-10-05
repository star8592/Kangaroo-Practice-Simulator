import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { buildReviewAttempt } from "@/lib/review-attempt";

export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user || user.role !== "student") return NextResponse.json({ error: "请先登录学生账号" }, { status: 401 });
  const attemptId = String(req.nextUrl.searchParams.get("attemptId") || "");
  if (!attemptId) return NextResponse.json({ error: "missing attemptId" }, { status: 400 });
  const review = buildReviewAttempt(user, attemptId);
  return review ? NextResponse.json(review) : NextResponse.json({ error: "复盘记录不存在" }, { status: 404 });
}
