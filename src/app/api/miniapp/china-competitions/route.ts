import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { CHINA_MATH_EVENTS } from "@/lib/china-math-competitions";
import { CHINA_MATH_COMPANIONS } from "@/lib/china-math-companion";
import { getCompetitionCompanionProgress } from "@/lib/competition-companion-progress";

export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  const entries = CHINA_MATH_EVENTS.map(event => {
    const companion = CHINA_MATH_COMPANIONS.find(item => item.id === event.companionId);
    return {
      event, companion,
      progress: user?.role === "student" && companion
        ? getCompetitionCompanionProgress(user.id, companion.id)
        : null,
    };
  });
  return NextResponse.json({ entries }, { headers: { "Cache-Control": "private, no-store" } });
}
