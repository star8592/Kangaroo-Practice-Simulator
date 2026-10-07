import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";

export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user || user.role !== "student") return NextResponse.json({ error: "请先登录学生账号" }, { status: 401 });
  const exams = listTrainingExamProfiles()
    .filter(x => x.paperType !== "practice")
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .map(x => ({
      id: x.id,
      name: x.nameZh || x.name,
      nameEn: x.name,
      year: x.year,
      country: x.country,
      grades: x.grades,
      questionCount: x.questionCount,
      maxScore: x.maxScore,
      durationSeconds: x.durationSeconds,
      competitionId: x.competitionId,
      paperType: x.paperType,
      timingSections: x.timingSections || [],
      miniappReady: !(x.timingSections || []).length,
    }));
  return NextResponse.json({ exams });
}
