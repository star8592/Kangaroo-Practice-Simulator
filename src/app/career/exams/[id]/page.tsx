import Link from "next/link";
import {notFound} from "next/navigation";
import CareerFormalExamRunner from "@/components/CareerFormalExamRunner";
import {CAREER_FORMAL_PAPERS,getCareerFormalPaper} from "@/lib/career-formal-bank";
import styles from "../../practice/career-practice.module.css";

export function generateStaticParams(){
  return CAREER_FORMAL_PAPERS.map(p=>({id:p.id}));
}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const paper=getCareerFormalPaper(id);
  return {
    title:paper?paper.title+"｜SOCTHINK标准模拟笔试":"模拟笔试不存在",
    description:paper?"正式入场确认、45分钟计时、24道原创题、服务端评分、逐题解析及版本化题源记录。不是企业官方试卷。":undefined,
    alternates:{canonical:"/career/exams/"+id},
  };
}
export default async function CareerFormalExamPage({params}:{
  params:Promise<{id:string}>;
}){
  const {id}=await params;
  const paper=getCareerFormalPaper(id);
  if(!paper||paper.questions.length!==24)notFound();
  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置">
      <Link href="/career">职业资料与考试</Link><span> / </span>
      <Link href="/career#digital-services">岗位模拟笔试</Link><span> / </span>
      <span>{paper.title}</span>
    </nav>
    <CareerFormalExamRunner paper={paper}/>
  </main>;
}
