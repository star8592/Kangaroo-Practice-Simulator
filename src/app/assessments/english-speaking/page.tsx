import Link from "next/link";
import type {Metadata} from "next";
import styles from "./english-speaking.module.css";

export const metadata:Metadata={
  title:"2027武汉中考英语听说机考｜地区原创模拟｜SOCTHINK",
  description:"武汉2027中考英语听说四题型备考，以及北京、上海、综合原创模拟训练。非官方真题或官方等值评分。",
  alternates:{canonical:"/assessments/english-speaking"},
};

const BASE="/english/pronunciation/app";
const wuhanHref=BASE+"/exam-simulator?paper=wuhan-2027&version=W2&mode=simulation";
const wuhanPracticeHref=BASE+"/exam-simulator?paper=wuhan-2027&version=W2&mode=practice&focus=";
const wuhanDrills=[
 {name:"听后选择",id:"scene-museum-meeting",detail:"听懂对话，选择正确信息。"},
 {name:"听后应答",id:"answer-gift-budget",detail:"听懂问题，录音完成英语应答。"},
 {name:"模仿朗读",id:"read-trees",detail:"先听原创范读，再模仿录音。"},
 {name:"听后转述",id:"retell-river-cleanup",detail:"提取关键信息并用英语转述。"},
] as const;
const wuhanSessions=[["08:30–09:00","09:10–09:40","09:50–10:20"],["10:30–11:00","11:10–11:40","11:50–12:20"],["14:00–14:30","14:40–15:10","15:20–15:50"],["16:00–16:30","16:40–17:10","17:20–17:50"]] as const;
const papers=[
  {id:"beijing-2026",name:"北京题型模拟",intro:"听力选择、听后回答、转述与短文朗读等原创题型练习。",duration:"约20分钟",href:BASE+"/exam-simulator?paper=beijing-2026&pack=A&mode=simulation"},
  {id:"shanghai-2026",name:"上海题型模拟",intro:"朗读、交际应答、听后复述与口头表达等原创短卷。",duration:"约10分钟",href:BASE+"/exam-simulator?paper=shanghai-2026&pack=A&mode=simulation"},
  {id:"integrated",name:"综合听说模拟",intro:"跨地区训练听力、固定文本朗读和开放式表达。",duration:"约22分钟",href:BASE+"/exam-simulator?paper=integrated&pack=A&mode=simulation"},
] as const;

export default function EnglishSpeakingExamCenter(){
 return <div className={styles.page} data-testid="english-speaking-exam-center">
  <nav className={styles.crumbs} aria-label="当前位置">
   <Link href="/">首页</Link><span>/</span><Link href="/assessments">考试中心</Link><span>/</span><span aria-current="page">英语听说</span>
  </nav>
  <header className={styles.hero}>
   <p className={styles.eyebrow}>SOCTHINK · LANGUAGE EXAMS</p>
   <h1>英语听说考试中心</h1>
   <p>听过、练过，还要考过才知道掌握得怎样。武汉2027优先备考，并提供北京、上海及综合原创模拟；发音学习和逐词纠音仍在 AccentLab 完成。</p>
   <div className={styles.heroLinks}><a href="#wuhan-2027">武汉2027备考</a><Link href="/english/pronunciation/app/practice-library">先去发音练习</Link></div>
  </header>
  <section className={styles.journey} id="wuhan-2027" aria-labelledby="wuhan-heading">
   <span className={styles.kicker}>2027 · 武汉中考</span>
   <h2 id="wuhan-heading">武汉英语听说机考备考</h2>
   <div className={styles.steps}><span>4月17—18日<br/>考试日期</span><span>30分<br/>计入英语总分</span><span>四类题型<br/>人机对话</span><span>30分钟<br/>含考务与设备测试</span></div>
   <p>根据所获2027年实施方案资料：听后选择、听后应答、模仿朗读、听后转述。具体题量、题序、答题净时长、分值和播音次数仍待核实；实施方案的公开发布链接待核。缓考日期为4月19日，成绩与英语纸笔考试成绩一并公布。</p>
   <div className={styles.cards}>
    <article className={styles.card}><h3>四题型原创模拟</h3><p>先选择适合的训练卷，熟悉设备检查与限时作答。题量与计时为教学设定。</p><Link href={wuhanHref}>进入武汉模拟训练 →</Link></article>
    <article className={styles.card}><h3>专项自由练习</h3><p>听力理解、应答、朗读、转述，可按原题回听、复练。</p><Link href={BASE+"/exam-simulator?paper=wuhan-2027&version=W2&mode=practice"}>进入自由练习 →</Link></article>
    <article className={styles.card}><h3>发音与纠音</h3><p>标准示范、逐词点读、跟读录音及模型参考反馈。</p><Link href={BASE+"/practice-library"}>进入发音训练 →</Link></article>
   </div>
   <h3 className={styles.wuhanSubheading}>四题型专项体验</h3>
   <div className={styles.wuhanDrills}>{wuhanDrills.map(drill=><article className={styles.card} key={drill.id}>
    <h3>{drill.name}</h3><p>{drill.detail}</p><Link href={wuhanPracticeHref+drill.id}>练习一题 →</Link>
   </article>)}</div>
   <p>电脑优先用于整卷演练；手机适合日常练习。四题型原创训练并非官方样卷，不承诺官方等值评分。</p>
   <details className={styles.wuhanSchedule}><summary>查看正式考试场次与教师演练参考</summary>
    <p>据所获实施方案，4月17—18日每日4个时段、12场；各场包含进退场和设备检测。考生实际场次以学校安排为准。以下不是本站排考结果。</p>
    <div className={styles.steps}>{wuhanSessions.map((sessions,index)=><div key={index} className={styles.sessionGroup}><strong>时段 {index+1}</strong>{sessions.map((session,i)=><div key={session}>第{index*3+i+1}场 · {session}</div>)}</div>)}</div>
    <p>教师可通过现有工作台安排听说练习；学校批量排考、跨设备成绩汇总仍在开发。</p>
    <Link href="/workspace">进入教师工作台 →</Link>
   </details>
  </section>
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
  <p className={styles.note}>所有现有卷均为原创教学训练，并非北京、上海、武汉官方真题，不能当作官方等值成绩。武汉专项的正式参数、跨设备学习档案和学校整班演练服务仍待完善。</p>
 </div>;
}
