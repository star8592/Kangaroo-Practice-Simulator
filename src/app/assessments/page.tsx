import AssessmentPortalClient from "@/components/AssessmentPortalClient";
export const metadata = {
  title: "综合考试与测评中心 | SOCTHINK",
  description: "真实可用的数学能力训练和国际数学竞赛测评，并逐步扩展职场技能实操、语言与专业考试。免费浏览，选择实际可做的测评。",
};
type PageProps = {searchParams: Promise<{q?: string | string[]}>};
export default async function AssessmentsPage({searchParams}:PageProps) {
  const params=await searchParams;
  const query=typeof params.q==="string"?params.q.trim().slice(0,160):"";
  return <AssessmentPortalClient initialQuery={query}/>;
}
