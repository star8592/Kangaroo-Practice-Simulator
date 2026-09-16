import ExamClient from "@/components/ExamClient";

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return <ExamClient examId={examId}/>;
}
