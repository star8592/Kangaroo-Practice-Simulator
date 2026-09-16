import { NextRequest, NextResponse } from "next/server";
import { gradeExam } from "@/lib/grading";
import { isExamBundleStudentReady, loadExamBundle } from "@/lib/question-bank";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const answers = (body?.answers ?? {}) as Record<string, string>;
    const examId = String(body?.examId ?? "level-a");
    const lang = body?.lang === "en" ? "en" : "zh";
    const bundle = loadExamBundle(examId);
    if (!isExamBundleStudentReady(bundle)) {
      return NextResponse.json({ error: "Exam is not student-ready" }, { status: 404 });
    }
    return NextResponse.json(gradeExam(bundle.questions, answers, bundle.profile, lang));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to grade exam" }, { status: 500 });
  }
}
