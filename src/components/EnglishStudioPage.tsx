import Link from "next/link";
import {englishProduct,type EnglishProductId} from "@/lib/english-products";
import styles from "@/app/english/english.module.css";

export default function EnglishStudioPage({studio}:{studio:EnglishProductId}){
 const item=englishProduct(studio);
 const ready=item.serviceUrl!==null;
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="英语学习路径">
   <Link href="/">SOC THINK</Link><span>/</span>
   <Link href="/english">英语学习</Link><span>/</span><span aria-current="page">{item.name}</span>
  </nav>
  <header className={styles.detailHero}>
   <div className={styles.icon} aria-hidden="true">{item.icon}</div>
   <div>
    <span className={styles.kicker}>{item.product}</span>
    <h1>{item.name}</h1>
    <p className={styles.lead}>{item.subtitle}</p>
    <p>{item.summary}</p>
   </div>
  </header>
  {studio==="reading" ? <section className={styles.readingOptions} aria-label="阅读与历史记录">
   <article className={styles.readingCard}>
    <span className={styles.kidsKicker}>少儿英语绘本 · 1—6 年级</span>
    <h2>小小阅读星球</h2>
    <p>72 篇原创英语故事，点按互动、故事听读和理解练习。独立免费入口，暂不保存正式学习成绩。</p>
    <a className={styles.primaryAction} href="/english/reading/kids/">进入小小阅读星球</a>
   </article>
   <article className={styles.readingCard}>
    <span className={styles.kidsKicker}>正式阅读主线 · AelOS</span>
    <h2>文章精读与阅读成长</h2>
    <p>AelOS 以文章、书库和分级阅读为主线，结合阅读理解、词汇和表达训练。旧 EnglishLeap 不再作为第二套阅读软件继续开发。</p>
    <a className={styles.primaryAction} href="/english/aelos/app/library">进入 AelOS 阅读</a>
   </article>
   <article className={styles.readingCard}>
    <span className={styles.kidsKicker}>历史兼容 · EnglishLeap</span>
    <h2>旧学习记录与备份</h2>
    <p>旧笔记、阅读进度和写作草稿可能只存在于此前使用的浏览器。先从原设备导出备份，不要在没有迁移验证前清除网站数据。</p>
    <a className={styles.primaryAction} href="/english/reading/app/progress">导出历史学习记录</a>
   </article>
  </section> : <section className={styles.launch} aria-label="学习入口">
   <div className={styles.launchText}>
    <strong>{ready?"打开主站学习应用":"独立阅读应用准备中"}</strong>
    <p>{item.detail}</p>
   </div>
   {item.serviceUrl
     ? <a className={styles.primaryAction} href={item.serviceUrl}>{item.serviceCta}</a>
     : <span className={styles.unavailable}>暂未开放</span>}
  </section>}
  {studio==="pronunciation" ? <p className={styles.entryNote}>
    发音练习后想检验学习效果？<Link href="/assessments/english-speaking">前往英语听说考试中心</Link>，选择原创9题试测或地区模拟卷。
    当前为原创教学训练，不是武汉2027等地区的官方考试卷，也不提供官方等值评分。
   </p> : null}
  <section className={styles.serviceNote} aria-label="账号与权益">
   <strong>账号与课程权益</strong>
   <p>学习应用已经部署在 SOC THINK 主站自己的目录下。各产品的学习数据仍独立管理；统一账号及跨产品购买权益尚未完成端到端验收，未经核验的付费功能不会提前收费。</p>
   <Link href={`/login?next=${encodeURIComponent(item.href)}`}>进入 SOC THINK 账号</Link>
  </section>
  <div className={styles.back}><Link href="/english">返回英语学习入口</Link></div>
 </div>
}
