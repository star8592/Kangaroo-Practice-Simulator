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
  {studio==="reading" ? <section className={styles.readingOptions} aria-label="按阅读阶段选择">
   <article className={styles.readingCard}>
    <span className={styles.kidsKicker}>少儿英语绘本 · 1—6 年级</span>
    <h2>小小阅读星球</h2>
    <p>24 本原创英语故事，点按会动、会说话；听自然配音，跟着故事做理解练习。暂不保存正式学习成绩。</p>
    <a className={styles.primaryAction} href="/english/reading/kids/">进入小小阅读星球</a>
   </article>
   <article className={styles.readingCard}>
    <span className={styles.kidsKicker}>进阶阅读 · EnglishLeap</span>
    <h2>青少年与成人精读</h2>
    <p>逐段阅读、词汇积累、理解分析与深度精读。独立阅读应用已开放体验，部分书库及口音功能仍在完善。</p>
    <a className={styles.primaryAction} href="/english/reading/app/">进入 EnglishLeap</a>
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
  <section className={styles.serviceNote} aria-label="账号与权益">
   <strong>账号与课程权益</strong>
   <p>学习应用已经部署在 SOC THINK 主站自己的目录下。各产品的学习数据仍独立管理；统一账号及跨产品购买权益尚未完成端到端验收，未经核验的付费功能不会提前收费。</p>
   <Link href={`/login?next=${encodeURIComponent(item.href)}`}>进入 SOC THINK 账号</Link>
  </section>
  <div className={styles.back}><Link href="/english">查看全部四个英语项目</Link></div>
 </div>
}
