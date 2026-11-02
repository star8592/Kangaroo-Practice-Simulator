import Link from "next/link";
import AssessmentTrustBrief from "@/components/AssessmentTrustBrief";
import {ASSESSMENT_EVIDENCE} from "@/lib/assessment-evidence";
import styles from "./measurement.module.css";

export const metadata={
 title:"9套能力训练与研究测评｜SOCTHINK 测评中心",
 description:"九套可作答的原创训练与研究性自评，逐项公开方法来源、适用对象、计分及验证状态。含大五人格、RIASEC、职业价值观、逻辑推理与招聘通用能力。",
 alternates:{canonical:"/assessment-center"},
};

const catalog=[
 {title:"推理与职业能力训练",subtitle:"完整模拟、逐题解析与实际任务表现",items:[
  {id:"advanced-reasoning-40",tag:"原创完整模拟",time:"45分钟",focus:"演绎、约束、归纳、假设与证据判断"},
  {id:"career-aptitude-40",tag:"原创完整模拟",time:"45分钟",focus:"言语、数量、逻辑、资料分析与空间"},
  {id:"workplace-sjt-24",tag:"情境判断训练",time:"约15–20分钟",focus:"沟通、协作、质量与交付决策"},
  {id:"reasoning-practice-20",tag:"基础练习",time:"约8–12分钟",focus:"数量、逻辑、方位与信息判断"},
  {id:"reading-practice-16",tag:"阅读任务练习",time:"按个人进度",focus:"信息定位、推断、数量理解与证据核对"},
 ]},
 {title:"人格与职业探索",subtitle:"根据实际回答呈现描述性结果，不做心理诊断或人群排名",items:[
  {id:"ipip-big-five-50-cn-preview",tag:"公开题项研究译稿",time:"约10–15分钟",focus:"大五人格五维自我描述"},
  {id:"career-interest-exploration-30",tag:"职业兴趣研究",time:"约6–9分钟",focus:"RIASEC 六类职业活动兴趣"},
  {id:"work-values-30",tag:"原创职业探索",time:"约7–10分钟",focus:"六项职业价值观偏好"},
  {id:"work-style-24",tag:"原创行为探索",time:"约6–9分钟",focus:"计划、探索、协作与推进习惯"},
 ]},
] as const;
const lookup=new Map(ASSESSMENT_EVIDENCE.map(x=>[x.id,x]));
export default function MeasurementCenterPage(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="位置">
   <Link href="/assessments">全部考试</Link><span> / </span>测评中心
  </nav>
  <header className={styles.catalogHero}>
   <div className={styles.catalogHeroMain}>
    <span className={styles.catalogEyebrow}>SOCTHINK / ASSESSMENT CENTER</span>
    <h1>专业能力测评与训练</h1>
    <p>九套可作答项目。明确来源、规则与结果边界，先了解，再开始。</p>
    <div className={styles.catalogHeroLinks}>
     <Link href="/assessment-center/about">认识开发方</Link>
     <Link href="/assessment-center/methodology">查看全部技术档案</Link>
     <Link href="/assessment-center/report-preview">详细报告示例</Link>
    </div>
   </div>
   <div className={styles.catalogHeroFacts} aria-label="当前测评产品统计">
    <div><strong>{ASSESSMENT_EVIDENCE.length}</strong><span>套现有测评与训练</span></div>
    <div><strong>9 / 9</strong><span>公开来源和评分规则</span></div>
    <div><strong>未建立</strong><span>中国本土常模（如实披露）</span></div>
   </div>
  </header>
  <AssessmentTrustBrief variant="center"/>
  {catalog.map((group,groupIndex)=><section className={styles.catalogSection} key={group.title} aria-label={group.title}>
   <div className={styles.catalogHeading}>
    <div><span className={styles.eyebrowDark}>0{groupIndex+1} / ASSESSMENTS</span><h2>{group.title}</h2></div>
    <p>{group.subtitle}</p>
   </div>
   <div className={styles.catalogGrid}>
    {group.items.map((entry,index)=>{
     const evidence=lookup.get(entry.id);
     if(!evidence)return null;
     return <article className={styles.catalogCard} key={entry.id}>
      <div className={styles.catalogCardTop}>
       <span className={styles.catalogIndex}>{String(index+1).padStart(2,"0")}</span>
       <span className={styles.catalogType}>{entry.tag}</span>
      </div>
      <h3><Link href={evidence.path}>{evidence.name}</Link></h3>
      <p className={styles.catalogFocus}>{entry.focus}</p>
      <div className={styles.catalogFacts}><span>{entry.time}</span><span>{evidence.audience}</span></div>
      <dl className={styles.catalogMethod}>
       <div><dt>出处与依据</dt><dd>{evidence.source}</dd></div>
       <div><dt>验证状态</dt><dd>尚未建立适用人群的标准常模，结果限于训练或自我探索</dd></div>
      </dl>
      <div className={styles.catalogCardActions}>
       <Link className={styles.catalogStart} href={evidence.path}>进入测评 <span aria-hidden="true">→</span></Link>
       <Link className={styles.catalogEvidence} href={"/assessment-center/methodology#"+evidence.id}>技术档案</Link>
      </div>
     </article>;
    })}
   </div>
  </section>)}
  <section className={styles.catalogFootnote}>
   <div><h2>报告不是一个分数。</h2>
    <p>每一项结果应能回到原始答卷、计分规则和明确的解释边界。基础训练及简要结果免费；收费深度报告只按实际已上架商品和支付确认状态开放。</p></div>
   <Link href="/assessment-center/report-preview">先看完整报告样例 →</Link>
  </section>
  <div className={styles.catalogMinorNote}>
   <strong>心理健康筛查尚未开放。</strong> 不将研究性自评当作临床诊断，也不使用未经验证的人群百分位、IQ或职业录取率。
   <Link href="/assessment-center/methodology">查看证据状态</Link>
  </div>
 </div>;
}
