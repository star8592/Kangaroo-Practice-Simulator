import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { loadArithmeticSessions } from "@/lib/arithmetic-session-store";
import { buildMathEngineSnapshot, type TrainingPolicy } from "@/lib/math-engine";

const POLICIES = new Set<TrainingPolicy>(["exam", "discovery", "competition"]);

export async function GET(request: NextRequest) {
  const user = userFromSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const gradeRaw = request.nextUrl.searchParams.get("grade");
  const grade = gradeRaw ? Number(gradeRaw) : undefined;
  if (grade !== undefined && (!Number.isInteger(grade) || grade < 1 || grade > 12)) {
    return NextResponse.json({ error: "invalid grade" }, { status: 400 });
  }

  const policyRaw = request.nextUrl.searchParams.get("policy") || "discovery";
  if (!POLICIES.has(policyRaw as TrainingPolicy)) {
    return NextResponse.json({ error: "invalid policy" }, { status: 400 });
  }

  const sessions = loadArithmeticSessions(user.id, 500).filter((session) => grade === undefined || session.grade === grade);
  return NextResponse.json(buildMathEngineSnapshot(sessions, policyRaw as TrainingPolicy));
}
