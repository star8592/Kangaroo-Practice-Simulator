import { NextResponse } from "next/server";
import { loadExamBundle, publicQuestions } from "@/lib/question-bank";

export async function GET() {
  try {
    const bundle = loadExamBundle("level-a");
    return NextResponse.json({ profile: bundle.profile, questions: publicQuestions(bundle.questions) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load question bank" }, { status: 500 });
  }
}
