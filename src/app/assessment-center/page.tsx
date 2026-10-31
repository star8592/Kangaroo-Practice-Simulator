import Link from "next/link";
import {CENTER_SECTIONS,getInstrument} from "@/lib/measurement-center";
import styles from "./measurement.module.css";
export const metadata={
  title:"智量测评中心｜人格、职业兴趣与能力探索｜SOCTHINK",
  description:"专业测评与个人发展。清楚展示量表来源、验证状态和使用边界；先开放免费、未做中国常模验证的研究试测。",
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
      <p>第一批开放两套可完成的研究试测，更多量表与岗位测评按照验证进度逐步开放。</p>
    </div>
    <div className={styles.grid}>
      {CENTER_SECTIONS.map(section=>{
        const instrument="instrumentId" in section?getInstrument(section.instrumentId):undefined;
        return <article className={styles.tile} key={section.icon}>
          <div className={styles.tileTop}><span className={styles.tileNumber}>{section.icon}</span><span className={instrument?styles.previewBadge:styles.plannedBadge}>{instrument?"免费研究预览":"建设中"}</span></div>
          <h3>{section.title}</h3><p>{section.summary}</p>
          {instrument?<><div className={styles.tileInfo}>{instrument.items.length} 题 · {instrument.duration} · {instrument.audience}</div>
            <Link className={styles.tileLink} href={"/assessment-center/"+instrument.id}>查看依据并开始试测 <span aria-hidden="true">→</span></Link></>:
            <div className={styles.tileMuted}>待完成题库、评分和适用性验证后开放</div>}
        </article>;
      })}
    </div>
    <section className={styles.trust}>
      <div><span className={styles.eyebrowDark}>MEASUREMENT STANDARD</span><h2>一套测评，必须交代六件事</h2></div>
      <ol><li>测量什么，不测量什么</li><li>题项来源与使用许可</li><li>计分规则和反向计分</li><li>适用年龄及语言</li><li>信度、效度与常模证据</li><li>结果误差和建议使用边界</li></ol>
      <p>现阶段的中文研究试测尚未经本土信效度与常模验证。报告只呈现个人回答的维度均值，不推断智商、疾病、职业成功率或与全国人群的排名。</p>
      <div className={styles.sources}><a href="https://www.intestcom.org/page/16" target="_blank" rel="noopener noreferrer">ITC 技术测评指南 ↗</a><a href="https://ipip.ori.org/" target="_blank" rel="noopener noreferrer">IPIP 官方题项 ↗</a><a href="https://www.onetcenter.org/license_tools.html" target="_blank" rel="noopener noreferrer">O*NET 授权说明 ↗</a></div>
    </section>
  </div>;
}
