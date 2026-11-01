import Link from "next/link";
import {CENTER_SECTIONS,getInstrument} from "@/lib/measurement-center";
import styles from "./measurement.module.css";
export const metadata={
  title:"智量测评中心｜人格、职业兴趣、认知推理与学习能力｜SOCTHINK",
  description:"科学测评与认知任务：大五人格、职业兴趣、认知推理与原创阅读理解练习。独立公开题项来源、评分方式、验证进度与报告交付内容。",
  alternates:{canonical:"/assessment-center"},
};
export default function MeasurementCenterPage(){
  return <div className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="位置"><Link href="/assessments">全部考试</Link><span> / </span>科学测评</nav>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>SOCTHINK · ASSESSMENT CENTER</span>
      <h1>认识自己，从可信的测量开始。</h1>
      <p>智量测评中心参考国际心理与教育测量规范组织。每套测评公开来源、评分方式、适用范围与验证进度；未经验证的试测不包装成正式诊断或百分位排名。</p>
      <div className={styles.heroMeta}><span>公开权威原始资料和版本</span><span>先免费测评与简报</span><span>完整版可选付费</span></div>
    </section>
    <div className={styles.sectionHeading}>
      <div><span className={styles.eyebrowDark}>EXPLORE BY PURPOSE</span><h2>选择你想了解的方向</h2></div>
      <p>人格与兴趣独立归类；认知推理和阅读任务明确标记为非标准化练习。SQL 岗位训练已经迁出测评中心。</p>
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
    <section className={styles.premiumIntro}>
      <div><span className={styles.eyebrowDark}>REPORTING · FREE TO START</span>
        <h2>完成试测，免费先看简报；满意后再决定是否购买完整报告。</h2>
        <p>大五人格和职业兴趣各有独立的题项来源、计分逻辑及专属报告。详细版提供真实题项证据、全部维度、生活情境解读与可执行观察计划。未经本土验证的内容不会被包装为诊断。</p>
        <Link className={styles.tileLink} href="/assessment-center/report-preview">查看虚构样稿与具体交付内容 →</Link>
      </div>
      <div className={styles.premiumIntroAside}><strong>收费原则</strong>
        <p>测试过程免费 · 基本结果免费</p><p>详细报告在真实SKU上架后显示实际价格</p>
        <p>已付费报告由微信账号的服务端权益核验后交付</p>
      </div>
    </section>
    <section className={styles.trust}>
      <div><span className={styles.eyebrowDark}>MEASUREMENT STANDARD</span><h2>一套测评，必须交代六件事</h2></div>
      <ol><li>测量什么，不测量什么</li><li>题项来源与使用许可</li><li>计分规则和反向计分</li><li>适用年龄及语言</li><li>信度、效度与常模证据</li><li>结果误差和建议使用边界</li></ol>
      <p>人格与兴趣研究试测尚无中国本土常模；原创推理和阅读练习仅报告当次真实任务表现，不声称智商、临床诊断、升学预测或职业成功率。</p>
      <div className={styles.sources}><Link href="/assessment-center/methodology">查看全部测评技术档案与证据等级 →</Link><a href="https://www.intestcom.org/page/16" target="_blank" rel="noopener noreferrer">ITC 技术测评指南 ↗</a><a href="https://ipip.ori.org/" target="_blank" rel="noopener noreferrer">IPIP 官方题项 ↗</a><a href="https://www.onetcenter.org/license_tools.html" target="_blank" rel="noopener noreferrer">O*NET 授权说明 ↗</a></div>
    </section>
  </div>;
}
