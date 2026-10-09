import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { COMPETITION_COMPANIONS } from "@/lib/competition-companion";
import { getCompetitionCompanionProgress } from "@/lib/competition-companion-progress";

export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user || user.role !== "student") return NextResponse.json({ error: "请先登录学生账号" }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const companions = COMPETITION_COMPANIONS
    .filter(x => x.expiresAfter >= today && x.registrationVerified !== false)
    .map(x => ({ ...x, progress: getCompetitionCompanionProgress(user.id, x.id) }));
  return NextResponse.json({ companions });
}
