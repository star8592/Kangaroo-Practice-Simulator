import { NextResponse } from "next/server";
import { loadExamBundle, publicQuestions } from "@/lib/question-bank";

export async function GET(_req: Request, ctx: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await ctx.params;
    const bundle = loadExamBundle(examId);
    return NextResponse.json({ profile: bundle.profile, questions: publicQuestions(bundle.questions) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load exam" }, { status: 404 });
  }
}
