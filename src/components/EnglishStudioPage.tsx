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
  <section className={styles.launch} aria-label="学习入口">
   <div className={styles.launchText}>
    <strong>{ready?"打开主站学习应用":"独立阅读应用准备中"}</strong>
    <p>{item.detail}</p>
   </div>
   {item.serviceUrl
     ? <a className={styles.primaryAction} href={item.serviceUrl}>{item.serviceCta}</a>
     : <span className={styles.unavailable}>暂未开放</span>}
  </section>
  <section className={styles.serviceNote} aria-label="账号与权益">
   <strong>账号与课程权益</strong>
   <p>学习应用已经部署在 SOC THINK 主站自己的目录下。各产品的学习数据仍独立管理；统一账号及跨产品购买权益尚未完成端到端验收，未经核验的付费功能不会提前收费。</p>
   <Link href={`/login?next=${encodeURIComponent(item.href)}`}>进入 SOC THINK 账号</Link>
  </section>
  <div className={styles.back}><Link href="/english">查看全部四个英语项目</Link></div>
 </div>
}
