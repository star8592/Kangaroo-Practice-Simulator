import { NextRequest, NextResponse } from "next/server";
import { listTrainingExamProfiles, loadTrainingExamBundle, trainingQuestions } from "@/lib/training-question-bank";
import {canOpenSeamoNative} from "@/lib/miniapp-exam-readiness";

export async function GET(req: NextRequest) {
  // Public catalogue METADATA only: never returns question bodies, answers, user progress,
  // exam tickets or score data. Protected start/session routes retain their own auth checks.
  const seamoClientReady = req.headers.get('x-socthink-miniapp-capabilities') === 'seamo-timer-v1';
  const exams = listTrainingExamProfiles()
    .filter(x => x.paperType !== "practice" || x.competitionId === "seamo")
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
      miniappReady: x.competitionId === "seamo"
        ? seamoClientReady && canOpenSeamoNative(x, trainingQuestions(loadTrainingExamBundle(x.id).questions))
        : !(x.timingSections || []).length,
    }));
  return NextResponse.json({ exams });
}
