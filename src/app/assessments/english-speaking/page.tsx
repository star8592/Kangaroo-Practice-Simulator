import Link from "next/link";
import type {Metadata} from "next";
import styles from "./english-speaking.module.css";

export const metadata:Metadata={
  title:"英语听说考试中心｜北京·上海·综合原创模拟｜SOCTHINK",
  description:"SOC THINK 已开放的原创听说试测、北京上海与综合模拟训练，学—练—考—复练。非官方真题或官方等值评分。",
  alternates:{canonical:"/assessments/english-speaking"},
};

const BASE="/english/pronunciation/app";
const papers=[
  {id:"beijing-2026",name:"北京题型模拟",intro:"听力选择、听后回答、转述与短文朗读等原创题型练习。",duration:"约20分钟",href:BASE+"/exam-simulator?paper=beijing-2026&pack=A&mode=simulation"},
  {id:"shanghai-2026",name:"上海题型模拟",intro:"朗读、交际应答、听后复述与口头表达等原创短卷。",duration:"约10分钟",href:BASE+"/exam-simulator?paper=shanghai-2026&pack=A&mode=simulation"},
  {id:"integrated",name:"综合听说模拟",intro:"跨地区训练听力、固定文本朗读和开放式表达。",duration:"约22分钟",href:BASE+"/exam-simulator?paper=integrated&pack=A&mode=simulation"},
] as const;

export default function EnglishSpeakingExamCenter(){
 return <main className={styles.page} data-testid="english-speaking-exam-center">
  <nav className={styles.crumbs} aria-label="当前位置">
   <Link href="/">首页</Link><span>/</span><Link href="/assessments">考试中心</Link><span>/</span><span aria-current="page">英语听说</span>
  </nav>
  <header className={styles.hero}>
   <p className={styles.eyebrow}>SOCTHINK · LANGUAGE EXAMS</p>
   <h1>英语听说考试中心</h1>
   <p>听过、练过，还要考过才知道掌握得怎样。统一选择已有听说测评与地区原创模拟卷；发音学习和逐词纠音仍在 AccentLab 完成。</p>
   <div className={styles.heroLinks}><a href="#papers">选择试卷</a><Link href="/english/pronunciation/app/practice-library">先去发音练习</Link></div>
  </header>
  <section className={styles.journey} aria-label="学习到复练的闭环">
   <h2>学 → 练 → 考 → 再练</h2>
   <div className={styles.steps}><span>听示范、学发音</span><span>跟读、录音、纠音</span><span>听说模拟测评</span><span>看反馈、针对性复练</span></div>
   <p>当前考试报告由既有引擎在考试页面生成；暂未统一归档到跨设备学习报告。尚未完成真实语义评分的开放口语题只记录作答，不编造分数。</p>
  </section>
  <section className={styles.quick} aria-labelledby="trial-heading">
   <div><span className={styles.kicker}>快速体验</span><h2 id="trial-heading">原创9题听说试测</h2><p>5道听力理解＋4道朗读。适合第一次体验或阶段性检查。</p></div>
   <Link href={BASE+"/exam-trial"}>开始9题试测 <span aria-hidden="true">→</span></Link>
  </section>
  <section className={styles.list} id="papers" aria-labelledby="papers-heading">
   <div className={styles.heading}><div><span className={styles.kicker}>原创地区模拟</span><h2 id="papers-heading">选择考试</h2></div><p>保留两套原创训练卷及自由练习/模拟模式，进入时默认使用第1套模拟模式。</p></div>
   <div className={styles.cards}>{papers.map((p,index)=><article className={styles.card} key={p.id}>
    <span className={styles.num}>0{index+1} / MOCK</span><h3>{p.name}</h3><p>{p.intro}</p><small>{p.duration} · 可切换第2套</small>
    <Link href={p.href}>进入模拟考试 →</Link>
   </article>)}</div>
  </section>
  <section className={styles.retrain} aria-label="考后复练">
   <div><h2>考试结束后继续学习</h2><p>查看分项反馈，找出未掌握的听力内容、朗读句子或词汇，再回 AccentLab 重练；下一次模拟才能检验是否真正进步。</p></div>
   <Link href="/english/pronunciation/app/practice-library">进入专项复练</Link>
  </section>
  <p className={styles.note}>所有现有卷均为原创教学训练，并非北京、上海、武汉官方真题，不能当作官方等值成绩。武汉专项考试仍在开发中，不会伪装为已开放。</p>
 </main>;
}
