import Link from "next/link";
import {CENTER_SECTIONS,getInstrument} from "@/lib/measurement-center";
import styles from "./measurement.module.css";
export const metadata={
  title:"智量测评中心｜人格、兴趣、推理、SQL与阅读学习｜SOCTHINK",
  description:"科学测评与真实任务练习：大五人格、职业兴趣、认知推理、SQL岗位技能与原创阅读理解训练。公开来源、评分规则和验证状态。",
  alternates:{canonical:"/assessment-center"},
};
export default function MeasurementCenterPage(){
  return <div className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置"><Link href="/assessments">全部考试</Link><span> / </span>科学测评</nav>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>SOCTHINK · ASSESSMENT CENTER</span>
      <h1>认识自己，从可信的测量开始。</h1>
      <p>智量测评中心依据心理与教育测量规范设计。每套测评公开来源、评分方式、适用范围与验证进度；未经验证的试测不包装成正式诊断或百分位排名。</p>
      <div className={styles.heroMeta}><span>清楚交代科学依据</span><span>真实评分，不虚构常模</span><span>研究预览免费体验</span></div>
    </section>
    <div className={styles.sectionHeading}>
      <div><span className={styles.eyebrowDark}>EXPLORE BY PURPOSE</span><h2>选择你想了解的方向</h2></div>
      <p>现已开放两套人格与兴趣研究试测，以及认知推理、真实 SQL 和阅读理解三套任务练习。每项都公开评分依据和适用边界。</p>
    </div>
    <div className={styles.grid}>
      {CENTER_SECTIONS.map(section=>{
        const instrument="instrumentId" in section?getInstrument(section.instrumentId):undefined;
        const route="route" in section?section.route:instrument?"/assessment-center/"+instrument.id:undefined;
        const detail="detail" in section?section.detail:instrument?`${instrument.items.length}题 · ${instrument.duration} · ${instrument.audience}`:"待完成题库与验证后开放";
        return <article className={styles.tile} key={section.icon}>
          <div className={styles.tileTop}><span className={styles.tileNumber}>{section.icon}</span><span className={route?styles.previewBadge:styles.plannedBadge}>{instrument?"免费研究预览":route?"免费任务练习":"建设中"}</span></div>
          <h3>{section.title}</h3><p>{section.summary}</p>
          <div className={route?styles.tileInfo:styles.tileMuted}>{detail}</div>
          {route&&<Link className={styles.tileLink} href={route}>查看任务与方法 <span aria-hidden="true">→</span></Link>}
        </article>;
      })}
    </div>
    <section className={styles.trust}>
      <div><span className={styles.eyebrowDark}>MEASUREMENT STANDARD</span><h2>一套测评，必须交代六件事</h2></div>
      <ol><li>测量什么，不测量什么</li><li>题项来源与使用许可</li><li>计分规则和反向计分</li><li>适用年龄及语言</li><li>信度、效度与常模证据</li><li>结果误差和建议使用边界</li></ol>
      <p>人格与兴趣研究试测尚无中国本土常模；原创推理、SQL 和阅读练习仅报告当次真实任务表现，不声称智商、临床诊断、升学预测或职业成功率。</p>
      <div className={styles.sources}><Link href="/assessment-center/methodology">查看全部测评技术档案与证据等级 →</Link><a href="https://www.intestcom.org/page/16" target="_blank" rel="noopener noreferrer">ITC 技术测评指南 ↗</a><a href="https://ipip.ori.org/" target="_blank" rel="noopener noreferrer">IPIP 官方题项 ↗</a><a href="https://www.onetcenter.org/license_tools.html" target="_blank" rel="noopener noreferrer">O*NET 授权说明 ↗</a></div>
    </section>
  </div>;
}
