import { NextResponse } from "next/server";
import { LEVEL_A_PROFILE, loadQuestionBank, publicQuestions } from "@/lib/question-bank";

export async function GET() {
  try {
    const bank = loadQuestionBank();
    return NextResponse.json({ profile: LEVEL_A_PROFILE, questions: publicQuestions(bank) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load question bank" }, { status: 500 });
  }
}
