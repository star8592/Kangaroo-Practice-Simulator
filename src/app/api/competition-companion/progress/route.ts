import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { COMPETITION_COMPANIONS } from "@/lib/competition-companion";
import {
  getCompetitionCompanionProgress,
  setCompetitionCompanionTask,
} from "@/lib/competition-companion-progress";

function currentUser(req: NextRequest) {
  return userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "student login required" }, { status: 401 });
  }

  const companionId = String(req.nextUrl.searchParams.get("companionId") || "");
  const companion = COMPETITION_COMPANIONS.find((x) => x.id === companionId);
  if (!companion) {
    return NextResponse.json({ error: "unknown companion" }, { status: 404 });
  }

  return NextResponse.json({
    progress: getCompetitionCompanionProgress(user.id, companionId),
  });
}

export async function PATCH(req: NextRequest) {
  const user = currentUser(req);
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "student login required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const companionId = String(body?.companionId || "");
    const taskId = String(body?.taskId || "");
    const completed = Boolean(body?.completed);

    const companion = COMPETITION_COMPANIONS.find((x) => x.id === companionId);
    if (!companion) {
      return NextResponse.json({ error: "unknown companion" }, { status: 404 });
    }
    if (!companion.tasks.some((task) => task.id === taskId)) {
      return NextResponse.json({ error: "unknown task" }, { status: 400 });
    }

    return NextResponse.json({
      progress: setCompetitionCompanionTask(user.id, companionId, taskId, completed),
    });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
