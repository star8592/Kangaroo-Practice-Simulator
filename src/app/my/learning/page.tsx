import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import MyLearningClasses from "@/features/platform/MyLearningClasses";
import styles from "./learning-dashboard.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"我的学习中心｜SOC THINK",robots:{index:false,follow:false}};

const SUBJECTS=[
 {title:"英语",detail:"听力、发音跟读、词汇、分级阅读",href:"/english"},
 {title:"数学",detail:"口算训练、数学竞赛与错题复盘",href:"/math"},
 {title:"校内学科",detail:"已开放的语文、科学及其他学科内容",href:"/subjects"},
 {title:"职业技能",detail:"实训课程与专项技能训练",href:"/learn"},
 {title:"考试升学",detail:"考试介绍、模拟练习与赛事服务",href:"/assessments"},
 {title:"能力测评",detail:"查看可使用的测评项目与结果",href:"/assessment-center"},
] as const;

export default async function PersonalLearning(){
 const jar=await cookies();
 const me=parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
 if(!me?.active||!(me.wechatId||me.wechatOpenId))
   redirect("/login?next=%2Fmy%2Flearning");
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="所在位置"><Link href="/">SOC THINK</Link><span>/</span>学习中心</nav>
  <header className={styles.hero}>
   <span className={styles.kicker}>SOC THINK · MY LEARNING</span>
   <h1>我的学习中心</h1>
   <p>{me.name}，从自己的课堂和已开放课程继续学习。老师布置的任务与自主练习共用当前微信账号。</p>
   <div className={styles.heroLinks}>
    <Link href="#choose-subject">直接自主学习</Link><Link href="/teachers">找老师 · 加入班级</Link>
    <Link href="#my-class-title">我的课堂</Link>
   </div>
  </header>
  <section className={styles.section} aria-labelledby="study-modes">
   <div className={styles.sectionHeading}><div><span className={styles.kicker}>HOW TO LEARN</span>
    <h2 id="study-modes">你想怎么学？</h2><p>三种方式互不排斥。先自己学，想要老师指导时再加入班级。</p>
   </div></div>
   <div className={styles.modes}>
    <Link href="#choose-subject" className={styles.modeCard}>
      <span className={styles.modeNumber}>01 · SELF-STUDY</span><strong>自己学</strong>
      <span>选择英语、数学等学习内容，不需要老师、班级或教师费用。专项权益以实际开放内容为准。</span>
      <b>马上开始学习 →</b></Link>
    <Link href="/teachers" className={styles.modeCard}>
      <span className={styles.modeNumber}>02 · WITH A TEACHER</span><strong>跟老师学</strong>
      <span>选择公开招生的老师或使用老师邀请。老师可独立安排课程费用，SOC THINK 教师工具目前免费且不代收学费。</span>
      <b>找老师与班级 →</b></Link>
    <Link href="#my-class-title" className={styles.modeCard}>
      <span className={styles.modeNumber}>03 · CLASSMATES</span><strong>和同学一起学</strong>
      <span>加入已有教学班，跟随统一任务练习。班级里的协作与交流功能将按真实开放状态提供。</span>
      <b>查看我的课堂 →</b></Link>
   </div>
  </section>
  <section className={styles.section} aria-labelledby="choose-subject">
   <div className={styles.sectionHeading}>
    <div><span className={styles.kicker}>COURSES</span><h2 id="choose-subject">自主学习</h2>
      <p>从真实存在的课程和专项练习进入，不必重复注册。</p></div>
   </div>
   <div className={styles.courseGrid}>
    {SUBJECTS.map(item=><Link key={item.href} href={item.href} className={styles.course}>
      <strong>{item.title}</strong><span>{item.detail}</span><b>进入课程 →</b>
    </Link>)}
   </div>
  </section>
  <MyLearningClasses/>
  <section className={styles.section} aria-labelledby="my-records">
   <div className={styles.sectionHeading}><div>
    <span className={styles.kicker}>PROGRESS</span><h2 id="my-records">我的学习记录</h2>
    <p>只打开各专业系统已存储的真实记录，不填入模拟完成率或虚构分数。</p>
   </div></div>
   <div className={styles.courseGrid}>
    <Link className={styles.course} href="/student"><strong>数学练习报告</strong><span>查看已完成的数学训练、竞赛与错题记录。</span><b>查看成绩 →</b></Link>
    <Link className={styles.course} href="/english/pronunciation/my-classes"><strong>已加入的英语班级</strong><span>从老师的班级和跟读练习继续学习。</span><b>查看班级 →</b></Link>
    <Link className={styles.course} href="/account"><strong>账号与权益</strong><span>统一微信账号下的学习服务与购买记录。</span><b>查看账号 →</b></Link>
   </div>
   <p className={styles.notes}>跨学科统计与统一作业队列尚未全部接入；没有真实业务数据的项目不会显示虚假学习进度。</p>
  </section>
  <footer className={styles.footerLinks}><Link href="/">网站首页</Link><Link href="/teach">教师与机构服务</Link></footer>
 </div>;
}
