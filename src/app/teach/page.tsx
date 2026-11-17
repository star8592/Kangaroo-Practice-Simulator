import Link from "next/link";
import type {Metadata} from "next";
import styles from "./teach.module.css";
export const metadata:Metadata={title:"教师教学与学校培训｜SOC THINK",description:"SOC THINK 多学科教学服务：教师工作台、数学训练、英语发音、职业课程与学校机构培训。具体功能按主站统一授权开放。",alternates:{canonical:"/teach"}};
const SUBJECTS=[
 {title:"数学与竞赛",summary:"数学竞赛模拟、口算与学习报告",href:"/math"},
 {title:"英语与阅读",summary:"听说评分、词汇、阅读与绘本",href:"/english"},
 {title:"职业技能实训",summary:"真实项目、岗位技能与模拟训练",href:"/learn"},
 {title:"考试与测评目录",summary:"从现有公开目录选择可用训练",href:"/assessments"},
] as const;
export default function TeachLanding(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="所在位置"><Link href="/">SOC THINK</Link><span>/</span>教师与机构</nav>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>SOC THINK · FOR EDUCATORS</span>
   <h1>同一个平台，服务不同学科的教学</h1>
   <p>独立老师使用自己的教学工作空间；学校、机构与企业在统一教学能力上组织课程。无需为英语、数学、职业课程分别注册或购买重复后台。</p>
   <p><strong>教师试用期免费：</strong>现阶段老师使用班级、作业、学生管理和招生工具不收平台使用费，也不抽取教学佣金。老师自己的课程收费可以独立安排，平台不参与收款或分账。</p>
   <div className={styles.actions}>
    <Link href="/workspace" className={styles.primary}>已授权教师进入工作台</Link>
    <Link href="#organizations" className={styles.secondary}>学校与企业培训</Link>
   </div>
   <p className={styles.notice}>主站已提供统一微信登录和模块授权工作台。跨学科统一发作业、学校批量采购等能力正在分阶段接入，未完成的服务不会作为现成商品出售。</p>
  </header>
  <section className={styles.section} aria-labelledby="teacher-day">
   <h2 id="teacher-day">老师每天需要做的事</h2>
   <div className={styles.steps}>
    <div><strong>01 · 选择资源</strong><p>从已开放的数学、英语或职业内容中选择教学材料。</p></div>
    <div><strong>02 · 安排练习</strong><p>通过获授权的教学模块布置任务，逐步归入统一教师工作台。</p></div>
    <div><strong>03 · 查看反馈</strong><p>保留原有专项评分，逐步整合完成情况和薄弱能力报告。</p></div>
   </div>
  </section>
  <section className={styles.section} aria-labelledby="available-content">
   <div className={styles.heading}><h2 id="available-content">可探索的教学内容</h2><p>入口均连接真实存在的学习目录。</p></div>
   <div className={styles.contentGrid}>
    {SUBJECTS.map(item=><Link key={item.href} href={item.href} className={styles.contentCard}>
     <strong>{item.title}</strong><span>{item.summary}</span><b>查看内容 →</b>
    </Link>)}
   </div>
  </section>
  <section id="organizations" className={styles.section} aria-labelledby="organization-title">
   <span className={styles.eyebrow}>FOR SCHOOLS & ORGANIZATIONS</span>
   <h2 id="organization-title">学校、培训机构与企业</h2>
   <div className={styles.steps}>
    <div><strong>学校与教育机构</strong><p>统一管理教师、班级、课程授权和本校获授权学情汇总。</p></div>
    <div><strong>企业与职业培训</strong><p>按培训项目安排学习、实操与完成报告，不擅自读取员工个人学习资料。</p></div>
    <div><strong>统一身份与计费</strong><p>所有购买与权益均使用主站账户和统一支付账本，不为机构另造系统。</p></div>
   </div>
   <p className={styles.notice}>机构集中管理、席位和统一跨学科报表属于正在开发的功能，正式开通以实际验收为准。</p>
  </section>
  <footer className={styles.bottom}><Link href="/">返回学习首页</Link><Link href="/workspace">教师工作台</Link></footer>
 </div>;
}