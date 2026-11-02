import Link from "next/link";
import styles from "@/app/assessment-center/measurement.module.css";
export const metadata={
 title:"真实技能实训｜SOC THINK",
 description:"与心理与人格测评完全分离的实践训练中心。现开放 SQL 数据分析实训，基于实际 SQLite 执行与双数据集验证。",
 alternates:{canonical:"/skill-labs"}
};
export default function SkillLabsHome(){
 return <div className={styles.shell}>
   <header className={styles.hero}>
    <span className={styles.eyebrow}>SOCTHINK · SKILL LABS</span>
    <h1>学习一项技能，用真实任务来检验。</h1>
    <p>这里是技能实训，不是人格、心理或智商测评。我们让你亲自操作，按预先确定的业务规则和可复核的输出结果反馈。</p>
    <div className={styles.heroMeta}><span>实操优先</span><span>真实执行</span><span>免费训练记录</span></div>
   </header>
   <div className={styles.sectionHeading}><div><span className={styles.eyebrowDark}>PRACTICE BY DOING</span><h2>已开放的技能实训</h2></div></div>
   <div className={styles.grid}><article className={styles.tile}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>01 / DATA</span><span className={styles.previewBadge}>免费实训</span></div>
    <h3>SQL 数据工程 · 8项真实任务</h3>
    <p>从订单筛选与多表关联，到日期趋势、支付退款对账、未付款客户识别和城市汇总。浏览器内 SQLite 真正执行三组原创数据并核验结果。</p>
    <div className={styles.tileInfo}>SQLite WebAssembly · 无生产数据 · 非岗位资格认证</div>
    <Link className={styles.tileLink} href="/skill-labs/sql-lab">进入独立 SQL 实训台 <span aria-hidden="true">→</span></Link>
   </article></div>
 </div>;
}
