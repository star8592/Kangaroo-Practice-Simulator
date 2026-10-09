import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { WORLD_COMPETITIONS } from "@/lib/world-competitions";
import { getWorldCompanion } from "@/lib/competition-companion";
import { getCompetitionCompanionProgress } from "@/lib/competition-companion-progress";

/** One worldwide catalogue, with privacy-scoped task progress. */
export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const entries = WORLD_COMPETITIONS.map(event => {
    const companion = getWorldCompanion(event.id, today);
    return {
      event,
      companion,
      progress: user?.role === "student" && companion
        ? getCompetitionCompanionProgress(user.id, companion.id)
        : null,
    };
  });
  return NextResponse.json({ entries }, { headers: { "Cache-Control": "private, no-store" } });
}
