import { NextResponse } from "next/server";
import { loadQuestionBank } from "@/lib/question-bank";

export async function GET() {
  try {
    return NextResponse.json({ questions: loadQuestionBank() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load bank" }, { status: 500 });
  }
}
