import Link from "next/link";
import {notFound} from "next/navigation";
import CareerPracticeRunner from "@/components/CareerPracticeRunner";
import {isCareerFormalPaper,CAREER_FORMAL_PAPERS} from "@/lib/career-formal-bank";
import {getCareerPractice,CAREER_PRACTICE_CASES} from "@/lib/career-practice";
import {listCareerDemandFamilies} from "@/lib/career-demand";
import styles from "../career-practice.module.css";

export const metadata={
  title:"原创职业岗位实操与免费评分｜SOCTHINK",
  description:"依据企业公开岗位能力方向设计的原创训练。在线答题、服务端评分、逐题反馈和重新挑战；非企业官方真题。",
};
export function generateStaticParams(){
  return CAREER_PRACTICE_CASES.map(x=>({id:x.id}));
}
export default async function CareerPracticePage({params}:{
  params:Promise<{id:string}>;
}){
  const {id}=await params;
  const practice=getCareerPractice(id);
  if(isCareerFormalPaper(id)||!practice||practice.deliveryState!=="free-live-preview")notFound();
  const roleEvidence=listCareerDemandFamilies().flatMap(x=>x.signals)
    .find(x=>x.id===practice.evidenceSignalId&&x.evidenceLevel==="job");
  if(!roleEvidence)notFound();
  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置">
      <Link href="/assessments">综合考试</Link><span> / </span>
      <Link href="/career">企业岗位需求</Link><span> / </span>
      <span>6题热身练习</span>
    </nav>
    <header className={styles.hero}>
      <span className={styles.overline}>SOCTHINK · 6题岗位热身 / 非标准笔试</span>
      <h1>{practice.title}</h1>
      <p>本页是6题、15分钟的免费专项热身，不是正式岗位笔试；更完整的24题45分钟模拟卷需要先确认入场并计时。</p>
      <div className={styles.pills}><Link href={"/career/exams/"+CAREER_FORMAL_PAPERS.find(x=>x.family===practice.family)!.id} style={{fontWeight:800,color:"#fff"}}>进入该岗位24题标准笔试 →</Link></div>
      <div className={styles.pills}><span>免费开放</span><span>{practice.questions.length} 题</span>
        <span>满分 {practice.maxPoints} 分</span><span>参考用时 {practice.durationMinutes} 分钟</span></div>
    </header>
    <aside className={styles.provenance}>
      <strong>热身训练的取材说明 · 原创版本 2026-11-01</strong>
      <p>参考岗位领域：{roleEvidence.company} · {roleEvidence.roleTitle}。企业公开招聘资料仅作为岗位能力研究依据；本案例、供应商、数据与评分规则由 SOCTHINK 独立原创。没有企业授权或合作声明，也不代表该职位目前正在招聘。</p>
      <a href={roleEvidence.sourceUrl} target="_blank" rel="noopener noreferrer">
        查看相关公开招聘来源
      </a>
    </aside>
    <CareerPracticeRunner practice={practice}/>
  </main>;
}
