import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import type { ArithmeticGrade } from "@/lib/arithmetic";
import { checkMiniappArithmetic, finishMiniappArithmetic, startMiniappArithmetic, type MiniArithmeticResponse } from "@/lib/miniapp-arithmetic";

export async function POST(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user || user.role !== "student") return NextResponse.json({ error: "请先登录学生账号" }, { status: 401 });
  try {
    const body = await req.json();
    const action = String(body?.action || "start");
    if (action === "start") {
      const grade = Math.min(12, Math.max(1, Number(body?.grade) || user.grade || 1)) as ArithmeticGrade;
      const mode = body?.mode === "diagnostic" || body?.mode === "speed" ? body.mode : "adaptive";
      return NextResponse.json(startMiniappArithmetic(user, grade, mode));
    }
    if (action === "check") {
      return NextResponse.json(checkMiniappArithmetic(user, String(body?.token || ""), Number(body?.index), String(body?.answer || ""), body));
    }
    if (action === "finish") {
      const responses = Array.isArray(body?.responses) ? body.responses as MiniArithmeticResponse[] : [];
      return NextResponse.json(finishMiniappArithmetic(user, String(body?.token || ""), responses));
    }
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "训练请求失败" }, { status: 400 });
  }
}
