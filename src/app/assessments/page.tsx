import AssessmentPortalClient from "@/components/AssessmentPortalClient";
export const metadata = {
  title: "综合考试与测评中心 | SOCTHINK",
  description: "中小学与升学、数学竞赛、语言考试、大学考研和职业资格考试的统一目录。计算训练、竞赛模拟、真题资料和考试日程均从所属考试进入；岗位、技能与人格测评分别有独立业务栏目。",
  alternates: { canonical: "/assessments" },
};
type PageProps = {searchParams: Promise<{q?: string | string[]}>};
export default async function AssessmentsPage({searchParams}:PageProps) {
  const params=await searchParams;
  const query=typeof params.q==="string"?params.q.trim().slice(0,160):"";
  return <AssessmentPortalClient initialQuery={query}/>;
}
