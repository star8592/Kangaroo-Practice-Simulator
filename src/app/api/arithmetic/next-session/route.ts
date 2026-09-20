import { NextRequest, NextResponse } from "next/server";
import { buildTrainingPlan, type ArithmeticSession } from "@/lib/arithmetic-analytics";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "private", "arithmetic", "sessions.jsonl");

export async function POST(req: NextRequest) {
  const user = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const grade = Math.min(6, Math.max(1, Number(body.grade) || 1)) as ArithmeticSession["grade"];

  let sessions: ArithmeticSession[] = [];
  if (fs.existsSync(FILE)) {
    sessions = fs.readFileSync(FILE, "utf8")
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as ArithmeticSession];
        } catch {
          return [];
        }
      })
      .filter((item) => item.studentId === user.id);
  }

  const plan = buildTrainingPlan(grade, sessions);

  return NextResponse.json({
    ok: true,
    mode: "adaptive",
    grade,
    focusSkills: plan.accuracyFocusSkills,
    monitorSkills: plan.monitorSkills,
    fluencySkills: plan.fluencyFocusSkills,
    summary: plan.summaryZh,
  });
}
