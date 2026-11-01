import Link from "next/link";
import {notFound} from "next/navigation";
import CareerPracticeRunner from "@/components/CareerPracticeRunner";
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
  if(!practice||practice.deliveryState!=="free-live-preview")notFound();
  const roleEvidence=listCareerDemandFamilies().flatMap(x=>x.signals)
    .find(x=>x.id===practice.evidenceSignalId&&x.evidenceLevel==="job");
  if(!roleEvidence)notFound();
  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置">
      <Link href="/assessments">综合考试</Link><span> / </span>
      <Link href="/career">企业岗位需求</Link><span> / </span>
      <span>免费岗位实操</span>
    </nav>
    <header className={styles.hero}>
      <span className={styles.overline}>SOCTHINK · CAREER PRACTICE</span>
      <h1>{practice.title}</h1>
      <p>从企业实际招聘中的能力要求出发，用原创商业场景练习完成真实计算与决策。不是概念介绍，而是能提交、判分、复盘和重新挑战的在线实操。</p>
      <div className={styles.pills}><span>免费开放</span><span>{practice.questions.length} 题</span>
        <span>满分 {practice.maxPoints} 分</span><span>参考用时 {practice.durationMinutes} 分钟</span></div>
    </header>
    <aside className={styles.provenance}>
      <strong>招聘需求与练习来源说明</strong>
      <p>参考岗位领域：{roleEvidence.company} · {roleEvidence.roleTitle}。企业公开招聘资料仅作为岗位能力研究依据；本案例、供应商、数据与评分规则由 SOCTHINK 独立原创。没有企业授权或合作声明，也不代表该职位目前正在招聘。</p>
      <a href={roleEvidence.sourceUrl} target="_blank" rel="noopener noreferrer">
        查看相关公开招聘来源
      </a>
    </aside>
    <CareerPracticeRunner practice={practice}/>
  </main>;
}
