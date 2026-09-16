import { notFound } from "next/navigation";
import ExamClient from "@/components/ExamClient";
import { isExamBundleStudentReady, loadExamBundle } from "@/lib/question-bank";

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  try {
    const bundle = loadExamBundle(examId);
    if (!isExamBundleStudentReady(bundle)) notFound();
  } catch {
    notFound();
  }
  return <ExamClient examId={examId}/>;
}
