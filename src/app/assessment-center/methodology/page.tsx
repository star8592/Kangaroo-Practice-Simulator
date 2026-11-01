import Link from "next/link";
import {ASSESSMENT_EVIDENCE} from "@/lib/assessment-evidence";
import styles from "../measurement.module.css";
export const metadata={
 title:"测评技术档案与证据说明｜智量测评中心",
 description:"逐项公开量表来源、题项许可、评分规则、适用人群、证据等级与未验证边界。研究试测与任务练习均不冒充科学常模。",
 alternates:{canonical:"/assessment-center/methodology"}
};
export default function AssessmentMethodology(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="位置">
   <Link href="/assessment-center">智量测评中心</Link><span> / </span>测评技术档案
  </nav>
  <header className={styles.hero}>
    <span className={styles.eyebrow}>MEASUREMENT EVIDENCE · PUBLIC REGISTER</span>
    <h1>每项结果，都应当能追溯依据。</h1>
    <p>以下不是营销证书，而是公开的测评技术登记簿。你可以查看题项来源、计分办法、验证程度及不能作出的结论。算法测试通过，并不等于量表信效度得到科学验证。</p>
    <div className={styles.heroMeta}><span>4项测评与认知学习产品</span><span>0项取得中国人群标准化常模验证</span><span>不发放虚构资格认证</span></div>
  </header>
  <div className={styles.sectionHeading}>
    <div><span className={styles.eyebrowDark}>TECHNICAL REGISTER</span><h2>产品证据与限制逐项公开</h2></div>
    <p>当前全部项目处于研究或训练阶段。技术证据充分程度不同，不能混同为正式心理测量认证。</p>
  </div>
  <div className={styles.methodList}>
   {ASSESSMENT_EVIDENCE.map(record=><article id={record.id} key={record.id} className={styles.methodCard}>
    <div className={styles.tileTop}><span className={styles.eyebrowDark}>{record.category} · {record.version}</span><span className={styles.plannedBadge}>尚无本土标准常模</span></div>
    <h3>{record.name}</h3>
    <dl className={styles.details}>
      <div><dt>来源</dt><dd>{record.source}</dd></div>
      <div><dt>授权与题项</dt><dd>{record.permission}</dd></div>
      <div><dt>评分算法</dt><dd>{record.scoring}</dd></div>
      <div><dt>适用人群</dt><dd>{record.audience}</dd></div>
      <div><dt>已核对证据</dt><dd>{record.evidenceStatus}</dd></div>
      <div><dt>不能推断</dt><dd>{record.limitations}</dd></div>
      <div><dt>免费/收费</dt><dd>{record.fullReportOffer==="optional-after-verification"
        ?"答题和简要结果免费；详细个人探索报告按真实上架价格单独出售，只有支付核验后才交付。未上架时不开放付款。"
        :"当前任务免费，可查看实际练习的正确数与复盘。"}</dd></div>
    </dl>
    <Link className={styles.tileLink} href={record.path}>打开实际项目并查看使用说明 →</Link>
   </article>)}
  </div>
  <section className={styles.trust}>
    <span className={styles.eyebrowDark}>FUTURE VALIDATION</span>
    <h2>什么证据才允许更进一步？</h2>
    <p>人格、兴趣等自评量表需要翻译等值、信度、结构效度、目标人群公平性、适当常模以及适用对象边界。阅读、推理和岗位任务也需要真实项目统计、等价题卷、外部效标及样本研究，才能超出“这次任务做得怎样”的描述。</p>
    <p>没有这些数据，就只展示当次真实作答的结果。任何 AI 文本建议都不能代替标准化量表、专家诊断、学校录取或招聘决定。</p>
    <div className={styles.sources}>
      <a href="https://ipip.ori.org/" target="_blank" rel="noopener noreferrer">IPIP 公共题项来源 ↗</a>
      <a href="https://www.onetcenter.org/IP.html" target="_blank" rel="noopener noreferrer">O*NET 职业兴趣工具说明 ↗</a>
      <a href="https://www.intestcom.org/page/16" target="_blank" rel="noopener noreferrer">ITC 测评规范 ↗</a>
    </div>
  </section>
 </div>;
}
