import Link from "next/link";
import styles from "./SocthinkPortal.module.css";
import {regionByYear,regionPath,regionExamHref} from "@/lib/english-speaking-regions";
const wuhan=regionByYear("wuhan","2027")!;

// C and B customers have different journeys; disciplines remain shared.
const AUDIENCES=[
 {id:"learner",label:"我是学习者",title:"个人学习",description:"按学科找到课程、练习和测评；没有老师也能直接学习。",href:"/my/learning",action:"进入我的学习中心"},
 {id:"teacher",label:"我是老师／培训师",title:"教师教学",description:"了解跨学科教学服务；获授权后使用统一教师工作台。",href:"/teach",action:"了解教师服务"},
 {id:"organization",label:"我是学校／机构",title:"机构与企业培训",description:"学校、培训机构与企业在同一平台组织培训。",href:"/teach#organizations",action:"了解机构服务"},
] as const;
const ENTRIES=[
 {id:"math",label:"数学",detail:"国际竞赛 · 口算训练",icon:"∑",href:"/math"},
 {id:"english",label:"英语",detail:"听说训练 · 词汇 · 分级阅读",icon:"Aa",href:"/english"},
 {id:"k12",label:"校内学科",detail:"数学 · 英语 · 学科资源导航",icon:"课",href:"/subjects"},
 {id:"career",label:"职业技能",detail:"课程 · 项目实训",icon:"技",href:"/learn"},
 {id:"assessment",label:"能力测评",detail:"推理 · 职业测评",icon:"测",href:"/assessment-center"},
 {id:"exams",label:"考试升学",detail:"模拟考试 · 备考目录",icon:"考",href:"/assessments"},
] as const;
export default function SocthinkPortal(){
 return <div className={styles.shell} data-socthink-portal="true" data-site-shell="content">
  <section className={styles.intro}>
   <span className={styles.kicker}>SOC THINK · LEARN · TEACH · TRAIN</span>
   <h1>今天想学什么？</h1>
   <p>自己学、跟老师学、和同学一起学，都由你决定。一个平台，连接个人学习、教师教学与机构培训。</p>
   <div className={styles.studyChoices}>
     <Link href="/english">立即自主学习</Link><Link href="/teachers">找老师 · 选班级</Link>
   </div>
   <form action="/search" method="get" role="search" className={styles.search}>
    <label htmlFor="socthink-query" className={styles.srOnly}>搜索职业课程和技能资源</label>
    <input id="socthink-query" type="search" name="q" placeholder="搜索已收录的职业课程、技能或实训" maxLength={100}/>
    <button type="submit">搜索</button>
   </form>
  </section>
  <section className={styles.examSpotlight} aria-labelledby="wuhan-spotlight-title" data-testid="wuhan-home-promotion">
   <div className={styles.examSpotlightCopy}>
    <span className={styles.examSpotlightTag}>2027 武汉中考 · 听说新考制</span>
    <h2 id="wuhan-spotlight-title">听说机考30分，提前练起来</h2>
    <p>4月17—18日正式考试。首批{wuhan.papers.length}套四大题型原创限时模拟，考后查看原文证据、朗读错词及针对性复练建议。</p>
    <div className={styles.examSpotlightSkills}>{wuhan.skills.map(([name])=><span key={name}>{name}</span>)}</div>
    <div className={styles.examSpotlightActions}><Link href={regionPath(wuhan)}>进入武汉2027专版 →</Link><Link href={regionExamHref(wuhan,wuhan.papers[0],"simulation")}>开始模拟考试</Link></div>
    <small>依据长江日报2026年11月26日报道（武汉市政府门户转载）。本站原创训练，非官方试卷；开放口语语义评分仍待完善。</small>
   </div>
   <div className={styles.examSpotlightVisual} aria-hidden="true">
    <span>英语听说机考</span><strong>30<span>分</span></strong><div>英语总分 120 · 笔试 90</div>
    <svg viewBox="0 0 200 46" width="200" height="46" fill="none" aria-hidden="true">{[8,16,28,12,36,24,42,20,32,12,26,38,16,24,9,22,33,12,20].map((h,i)=><rect key={i} x={5+i*10} y={(46-h)/2} width="4" height={h} rx="2" fill="currentColor" opacity={0.45+(i%3)*0.2}/>)}</svg>
   </div>
  </section>
  <section className={styles.audienceSection} aria-labelledby="choose-audience">
   <div className={styles.sectionHeading}>
    <h2 id="choose-audience">选择适合你的方式</h2>
    <p>学习、授课和组织管理，分别提供清晰的入口。</p>
   </div>
   <div className={styles.audienceGrid}>
    {AUDIENCES.map(item=><Link href={item.href} key={item.id} data-audience={item.id} data-testid={`audience-${item.id}`} className={styles.audienceCard}>
     <small>{item.label}</small><strong>{item.title}</strong><span>{item.description}</span><b>{item.action} <span aria-hidden="true">→</span></b>
    </Link>)}
   </div>
  </section>
  <section id="learning-catalog" className={styles.catalogSection} aria-labelledby="catalog-title">
   <div className={styles.sectionHeading}>
    <h2 id="catalog-title">探索学习方向</h2>
    <p>直接进入实际开放的课程、练习、考试与测评。</p>
   </div>
   <nav aria-label="学习与考试分类" className={styles.grid}>
    {ENTRIES.map(entry=><div key={entry.id} className={styles.card}>
      <Link href={entry.href} className={styles.cardLink}>
       <span className={styles.icon} aria-hidden="true">{entry.icon}</span>
       <strong>{entry.label}</strong><span>{entry.detail}</span><small>进入 →</small>
      </Link>
    </div>)}
   </nav>
  </section>
  <p className={styles.note}>专项应用保留原生学习与评分界面。统一账户、授权和支付以真实开通状态为准。</p>
 </div>;
}
