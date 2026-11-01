import Link from "next/link";
import {CENTER_SECTIONS,getInstrument} from "@/lib/measurement-center";
import styles from "./measurement.module.css";
export const metadata={
  title:"智量测评中心｜招聘通用能力、逻辑推理、职业兴趣与人格｜SOCTHINK",
  description:"职业与科学测评：原创40题招聘通用能力模拟、逻辑推理、大五人格、职业兴趣与阅读理解。明确题项来源、评分与研究验证边界。",
  alternates:{canonical:"/assessment-center"},
};
export default function MeasurementCenterPage(){
  return <div className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置"><Link href="/assessments">全部考试</Link><span> / </span>科学测评</nav>
    <section className={styles.hero}>
      <h1>科学测评</h1>
      <p>免费试测与基本结果 · 详细报告按实际商品收费</p>
    </section>
    <div className={styles.sectionHeading}>
      <div><h2>选择测评</h2></div>
    </div>
    <div className={styles.grid}>
      {CENTER_SECTIONS.map(section=>{
        const instrument="instrumentId" in section?getInstrument(section.instrumentId):undefined;
        const route="route" in section?section.route:instrument?"/assessment-center/"+instrument.id:undefined;
        const detail="detail" in section?section.detail:instrument?`${instrument.items.length}题 · ${instrument.duration} · ${instrument.audience}`:"待完成题库与验证后开放";
        return <article className={styles.tile} key={section.icon}>
          <div className={styles.tileTop}><span className={styles.tileNumber}>{section.icon}</span><span className={route?styles.previewBadge:styles.plannedBadge}>{instrument?"免费研究预览":route?"免费训练":"建设中"}</span></div>
          <h3>{section.title}</h3><p>{section.summary}</p>
          <div className={route?styles.tileInfo:styles.tileMuted}>{detail}</div>
          {route&&<Link className={styles.tileLink} href={route}>{instrument?"开始测评":"开始练习"} <span aria-hidden="true">→</span></Link>}
        </article>;
      })}
    </div>
    <section className={styles.premiumIntro}>
      <div><h2>详细测评报告</h2>
        <p>查看维度评分、题项证据与行动建议。正式开放时展示价格，购买后由微信账号领取。</p>
        <Link className={styles.tileLink} href="/assessment-center/report-preview">查看报告样例 →</Link>
      </div>
    </section>
    <details className={styles.trust}>
      <summary>测评依据与适用范围</summary>
      <ol><li>测量什么，不测量什么</li><li>题项来源与使用许可</li><li>计分规则和反向计分</li><li>适用年龄及语言</li><li>信度、效度与常模证据</li><li>结果误差和建议使用边界</li></ol>
      <p>人格与兴趣研究试测尚无中国本土常模；原创推理和阅读练习仅报告当次真实任务表现，不声称智商、临床诊断、升学预测或职业成功率。</p>
      <div className={styles.sources}><Link href="/assessment-center/methodology">查看全部测评技术档案与证据等级 →</Link><a href="https://www.intestcom.org/page/16" target="_blank" rel="noopener noreferrer">ITC 技术测评指南 ↗</a><a href="https://ipip.ori.org/" target="_blank" rel="noopener noreferrer">IPIP 官方题项 ↗</a><a href="https://www.onetcenter.org/license_tools.html" target="_blank" rel="noopener noreferrer">O*NET 授权说明 ↗</a></div>
    </details>
  </div>;
}
