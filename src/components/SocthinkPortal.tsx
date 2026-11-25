import Link from "next/link";
import styles from "./SocthinkPortal.module.css";

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
  <section className={styles.catalogSection} aria-labelledby="tools-title">
   <div className={styles.sectionHeading}><h2 id="tools-title">创作与实用工具</h2><p>独立应用，共用 SOC THINK 账户入口。</p></div>
   <nav aria-label="创作与实用工具" className={styles.grid}>
    <div className={styles.card}><a href="/color/" className={styles.cardLink}><span className={styles.icon} aria-hidden="true">色</span><strong>AI 调色工坊</strong><span>本地图片调色 · 胶片风格 · LUT</span><small>免费体验 →</small></a></div>
   </nav>
  </section>
  <p className={styles.note}>专项应用保留原生学习与评分界面。统一账户、授权和支付以真实开通状态为准。</p>
 </div>;
}
