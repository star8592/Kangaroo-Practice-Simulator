import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import styles from "../../teach/teach.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"我的学习中心｜SOC THINK",robots:{index:false,follow:false}};
const ACTIVITIES=[
 {title:"数学与竞赛",description:"数学竞赛模拟、口算与训练",href:"/math"},
 {title:"英语学习",description:"发音、词汇、绘本与阅读",href:"/english"},
 {title:"校内学科",description:"查看目前已开放的学科资源",href:"/subjects"},
 {title:"职业与实训",description:"职业技能课程与实操",href:"/learn"},
 {title:"考试和测评",description:"选择实际开放的考试和测评",href:"/assessments"},
] as const;
export default async function PersonalLearning(){
 const jar=await cookies();
 const me=parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
 if(!me?.active||!(me.wechatId||me.wechatOpenId))
  redirect("/login?next=%2Fmy%2Flearning");
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb}><Link href="/">SOC THINK</Link><span>/</span>我的学习中心</nav>
  <header className={styles.hero}>
   <span className={styles.eyebrow}>SOC THINK · MY LEARNING</span>
   <h1>我的学习中心</h1>
   <p>{me.name}，从这里使用数学、英语、校内学科与职业学习服务，保持同一个微信账户。</p>
   <div className={styles.actions}><Link className={styles.primary} href="/subjects">选择学科</Link><Link className={styles.secondary} href="/account">我的账号与权益</Link></div>
   <p className={styles.notice}>不同项目的真实学习记录仍由原专业系统保存；跨学科汇总尚未接通的数据不会显示虚构的进度或成绩。</p>
  </header>
  <section className={styles.section} aria-labelledby="my-activities">
   <h2 id="my-activities">今天想学什么？</h2>
   <div className={styles.contentGrid}>
    {ACTIVITIES.map(item=><Link href={item.href} key={item.href} className={styles.contentCard}><strong>{item.title}</strong><span>{item.description}</span><b>进入学习 →</b></Link>)}
   </div>
  </section>
  <section className={styles.section} aria-labelledby="my-records">
   <h2 id="my-records">已有学习报告与权益</h2>
   <div className={styles.contentGrid}>
    <Link className={styles.contentCard} href="/student"><strong>数学学习报告</strong><span>查看数学练习、竞赛成绩和错题分析记录。</span><b>查看真实报告 →</b></Link>
    <Link className={styles.contentCard} href="/account"><strong>学习权益与订单</strong><span>使用统一账户管理已授权服务。</span><b>查看账号 →</b></Link>
   </div>
  </section>
  <footer className={styles.bottom}><Link href="/">返回首页</Link><Link href="/teach">教师与机构服务</Link></footer>
 </div>;
}