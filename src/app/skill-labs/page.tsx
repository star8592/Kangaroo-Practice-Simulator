import Link from "next/link";
import styles from "@/app/assessment-center/measurement.module.css";
import {ENGINEERING_TRACK_LIST} from "@/lib/engineering-code-tracks";
export const metadata={
 title:"真实技能实训｜SOC THINK",
 description:"原创AI Agent工程教程与可运行实验，SQL数据工程、JavaScript编程及岗位实操。真实执行与可复核结果，和心理测评分离。",
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
   <div className={styles.grid}>
   <article className={styles.tile}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>AI / AGENT</span><span className={styles.previewBadge}>免费完整教程</span></div>
    <h3>AI Agent工程 · 工具调用与独立验收</h3>
    <p>6节原创中文课程、可下载的Python实验源码。真实执行7项测试，识别越权工具、错误参数和“声称成功却没有交付”的情况。</p>
    <div className={styles.tileInfo}>Python 3.10+ · 零外部依赖 · 自研模拟器，非真实大模型认证</div>
    <Link className={styles.tileLink} href="/skill-labs/agent-foundations">阅读课程并下载源码 <span aria-hidden="true">→</span></Link>
   </article>
   <article className={styles.tile}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>01 / DATA</span><span className={styles.previewBadge}>免费实训</span></div>
    <h3>SQL 数据工程 · 8项真实任务</h3>
    <p>从订单筛选与多表关联，到日期趋势、支付退款对账、未付款客户识别和城市汇总。浏览器内 SQLite 真正执行三组原创数据并核验结果。</p>
    <div className={styles.tileInfo}>SQLite WebAssembly · 无生产数据 · 非岗位资格认证</div>
    <Link className={styles.tileLink} href="/skill-labs/sql-lab">进入独立 SQL 实训台 <span aria-hidden="true">→</span></Link>
   </article>
   <article className={styles.tile}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>02 / SOFTWARE</span><span className={styles.previewBadge}>免费实操</span></div>
    <h3>软件工程师 · 6项代码任务</h3>
    <p>真正编写并运行JavaScript：订单处理、支付统计、重试机制、测试稳定性、故障日志与事件合并，逐题4组实际输入验证。</p>
    <div className={styles.tileInfo}>QuickJS WebAssembly · 独立Worker · 非岗位资格认证</div>
    <Link className={styles.tileLink} href="/skill-labs/code-lab">进入编程实训台 <span aria-hidden="true">→</span></Link>
   </article>
   <article className={styles.tile}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>EXAM / SOFTWARE</span><span className={styles.previewBadge}>60分钟模拟</span></div>
    <h3>软件工程师 · 综合编程笔试</h3>
    <p>6道跨前端、后端和测试/SRE的代码题，60分钟限时，可跳题、复查与运行公开样例；交卷后逐题真实执行判分。</p>
    <div className={styles.tileInfo}>6道代码题 · 24组真实判分 · 100分原始成绩</div>
    <Link className={styles.tileLink} href="/skill-labs/engineering-mock">进入正式模拟考场 <span aria-hidden="true">→</span></Link>
   </article>
   {ENGINEERING_TRACK_LIST.map((track,i)=><article key={track.id} className={styles.tile}>
    <div className={styles.tileTop}><span className={styles.tileNumber}>{String(i+3).padStart(2,"0")} / {track.focus.toUpperCase()}</span><span className={styles.previewBadge}>免费实训</span></div>
    <h3>{track.name}</h3>
    <p>{track.subtitle}。四项可运行代码任务，覆盖岗位常见业务边界。</p>
    <div className={styles.tileInfo}>4项原创代码任务 · 16组真实执行 · 独立Worker</div>
    <Link className={styles.tileLink} href={"/skill-labs/engineering/"+track.id}>进入岗位专项训练 <span aria-hidden="true">→</span></Link>
   </article>)}
   </div>
 </div>;
}
