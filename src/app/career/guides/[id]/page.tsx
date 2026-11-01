import Link from "next/link";
import {notFound} from "next/navigation";
import CareerGuidePrintButton from "@/components/CareerGuidePrintButton";
import {CAREER_ORIGINAL_GUIDES,getCareerGuide} from "@/lib/career-original-guides";
import styles from "../../career.module.css";

export function generateStaticParams(){
  return CAREER_ORIGINAL_GUIDES.map(x=>({id:x.id}));
}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const guide=getCareerGuide(id);
  return {
    title:guide?guide.title+"｜SOCTHINK原创职业教程":"职业教程不存在",
    description:guide?.summary,
    alternates:{canonical:"/career/guides/"+id},
  };
}
export default async function CareerGuidePage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const guide=getCareerGuide(id);
  if(!guide||guide.deliveryState!=="free-original-material")notFound();
  return <main className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="当前位置">
      <Link href="/career">职业训练中心</Link><span>/</span><span>原创复习教程</span>
    </nav>
    <header className={styles.guideHero}>
      <span className={styles.kicker}>DIGITAL MATERIAL / ORIGINAL GUIDE</span>
      <h1>{guide.title}</h1>
      <p>{guide.summary}</p>
      <div className={styles.guideMeta}><span>完整教程免费开放</span>
        <span>版本 {guide.revision} · {guide.updatedAt}</span>
        <span>交付格式 Markdown · 可保存</span></div>
      <div className={styles.guideActions}>
        <a href={"/career/guides/"+guide.id+"/download"} download={guide.fileName}>
          下载完整原创教程（.md）
        </a>
        <CareerGuidePrintButton/>
        <Link href={"/career/practice/"+guide.caseId}>进入对应在线考试服务</Link>
      </div>
    </header>
    <div className={styles.guideReading}>
      <div className={styles.guideNotice}>
        适用人群：{guide.audience}。所有示例均为原创虚构业务数据，不是企业官方题库或专业执业意见。
      </div>
      {guide.sections.map((section,i)=><section key={section.heading} className={styles.guideChapter}>
        <span className={styles.kicker}>CHAPTER {String(i+1).padStart(2,"0")}</span>
        <h2>{section.heading}</h2>
        {section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}
        {section.checklist&&<div className={styles.guideChecklist}>
          <strong>本章自检</strong>
          <ul>{section.checklist.map(x=><li key={x}>{x}</li>)}</ul>
        </div>}
      </section>)}
    </div>
    <div className={styles.guideBottom}>
      <h2>读完以后，实际做一次</h2>
      <p>教程是可阅读、可保存的数字资料；在线考试是另外一项数字服务。两种产品采用同一岗位能力依据，但交付方式不同。</p>
      <div className={styles.guideActions}>
        <Link href={"/career/practice/"+guide.caseId}>开始在线实操与评分</Link>
        <Link href="/career">返回岗位热度与产品目录</Link>
      </div>
    </div>
  </main>;
}
