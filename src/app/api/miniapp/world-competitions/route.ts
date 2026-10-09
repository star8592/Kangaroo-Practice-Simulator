import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { WORLD_COMPETITIONS } from "@/lib/world-competitions";
import { getWorldCompanion } from "@/lib/competition-companion";
import { getCompetitionCompanionProgress } from "@/lib/competition-companion-progress";
import { canFollowWorldCompetitions, getWorldCompetitionFollows } from "@/lib/world-competition-follows";

/** One worldwide catalogue, with privacy-scoped task progress. */
export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const followed = new Set(canFollowWorldCompetitions(user) ? getWorldCompetitionFollows(user!.id).map(x=>x.eventId) : []);
  const entries = WORLD_COMPETITIONS.map(event => {
    const companion = getWorldCompanion(event.id, today);
    return {
      event,
      companion,
      following: canFollowWorldCompetitions(user) ? followed.has(event.id) : null,
      progress: user?.role === "student" && companion
        ? getCompetitionCompanionProgress(user.id, companion.id)
        : null,
    };
  });
  return NextResponse.json({ entries }, { headers: { "Cache-Control": "private, no-store" } });
}
