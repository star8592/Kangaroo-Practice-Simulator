import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { loadExamAttempts } from "@/lib/attempt-store";
import { buildExamCardResultState } from "@/lib/math-cardbook";

export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const attemptId = req.nextUrl.searchParams.get("attemptId")?.trim();
  if (!attemptId) return NextResponse.json({ error: "missing attemptId" }, { status: 400 });

  const attempts = loadExamAttempts(user.id, 500);
  const state = buildExamCardResultState(attempts, attemptId);
  if (!state) return NextResponse.json({ error: "card state unavailable" }, { status: 404 });

  return NextResponse.json(state);
}
