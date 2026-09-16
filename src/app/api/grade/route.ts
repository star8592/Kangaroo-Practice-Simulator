import { NextRequest, NextResponse } from "next/server";
import { gradeExam } from "@/lib/grading";
import { loadQuestionBank } from "@/lib/question-bank";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const answers = (body?.answers ?? {}) as Record<string, string>;
    const result = gradeExam(loadQuestionBank(), answers);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to grade exam" }, { status: 500 });
  }
}
