import Link from "next/link";
import type {Metadata} from "next";
import {ENGLISH_PRODUCTS} from "@/lib/english-products";
import styles from "./english.module.css";

export const metadata:Metadata={
 title:"英语学习｜少儿分级阅读·发音·单词·英语精读｜SOC THINK",
 description:"SOC THINK 英语学习：小学一至六年级互动分级绘本、发音跟读、单词课堂、进阶英语精读与综合英语学习。",
 alternates:{canonical:"/english"},
};

export default function EnglishHub(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="英语学习路径"><Link href="/">SOC THINK</Link><span>/</span><span aria-current="page">英语学习</span></nav>
  <header className={styles.hero}>
   <span className={styles.kicker}>SOC THINK · ENGLISH</span>
   <h1>英语学习</h1>
   <p>按学习目标选择：少儿绘本、发音跟读、单词学习、进阶阅读与综合提升。</p>
  </header>
  <section className={styles.kidsFeature} aria-labelledby="kids-reading-feature">
   <div>
    <span className={styles.kidsKicker}>小学 G1—G6 · 免费正式开放</span>
    <h2 id="kids-reading-feature">小小阅读星球</h2>
    <p>24 本原创互动英语绘本。看图、触摸发音、听男女声讲故事，再做理解练习；暂不生成正式成绩。</p>
   </div>
   <a className={styles.primaryAction} href="/english/reading/kids/">开始读故事</a>
  </section>
  <section aria-labelledby="english-choose">
   <div className={styles.headerRow}><h2 id="english-choose">选择学习方向</h2><p>4 个独立项目</p></div>
   <nav className={styles.grid} aria-label="英语四个独立学习项目">
    {ENGLISH_PRODUCTS.map(item=><article className={styles.tile} key={item.id}>
     <div className={styles.tileTop}><div className={styles.icon} aria-hidden="true">{item.icon}</div><div className={styles.tileMeta}><small>{item.product}</small><h3>{item.name}</h3></div></div>
     <p>{item.subtitle}</p><span className={styles.tileStatus}>{item.statusText}</span>
     <Link href={item.href} aria-label={`了解${item.name}`}>进入目录 <span aria-hidden="true">→</span></Link>
    </article>)}
   </nav>
  </section>
  <div className={styles.serviceNote}>
   <strong>一个入口，独立学习</strong>
   <p>各应用保留自己的课程、登录和学习记录。SOC THINK 统一账户与跨应用购买权益尚在接入，不把未验证的会员或收费服务标成已开通。</p>
  </div>
 </div>
}
