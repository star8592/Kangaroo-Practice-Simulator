import Link from "next/link";
import type {Metadata} from "next";
import {ENGLISH_PRODUCTS} from "@/lib/english-products";
import styles from "./english.module.css";

export const metadata:Metadata={
 title:"英语学习｜少儿绘本·发音·单词·阅读·高阶阅读·考试｜SOC THINK",
 description:"SOC THINK 英语学习：少儿绘本、发音跟读、单词课堂、英语阅读、AelOS 高阶阅读与英语考试中心。",
 alternates:{canonical:"/english"},
};

// Four independent English apps, with six task-first entry cards. Exam center is a reading app route.
const ENGLISH_DIRECT_ENTRIES=ENGLISH_PRODUCTS.flatMap(item=>item.id==="reading" ? [
 {id:"kids",name:"少儿英语绘本",product:"英语阅读 · 小小阅读星球",subtitle:"小学 1—6 年级 · 看图听故事 · 点触互动",statusText:"72 篇原创故事 · 免费开放",href:"/english/reading/kids/",icon:"📖"},
 {id:"reading-pro",name:"英语阅读",product:"文章阅读 · EnglishLeap",subtitle:"青少年及成人 · 文章 · 词汇 · 阅读理解",statusText:"阅读训练体验已开放",href:item.serviceUrl,icon:"R"},
 {id:"exams",name:"英语考试中心",product:"KET · PET · IELTS · TOEFL",subtitle:"考试规则 · 雅思口语计时演练 · 完整模拟卷建设中",statusText:"雅思原创口语演练已开放",href:"/english/reading/app/exams",icon:"EX"},
] : [
 {id:item.id,name:item.name,product:item.product,subtitle:item.subtitle,statusText:item.statusText,href:item.serviceUrl,icon:item.icon},
]);
export default function EnglishHub(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="英语学习路径"><Link href="/">SOC THINK</Link><span>/</span><span aria-current="page">英语学习</span></nav>
  <header className={styles.hero}>
   <span className={styles.kicker}>SOC THINK · ENGLISH</span>
   <h1>英语学习</h1>
   <p>直接选择：发音、单词、少儿绘本、英语阅读、高阶阅读或考试训练。</p>
  </header>
  <section aria-labelledby="english-choose">
   <div className={styles.headerRow}><h2 id="english-choose">选择学习内容</h2><p>四套应用 · 六个直接入口</p></div>
   <nav className={styles.grid} aria-label="英语学习直达入口">
    {ENGLISH_DIRECT_ENTRIES.map(item=><article className={styles.tile+" direct-entry-card"} key={item.id}><Link className="direct-entry-hit" data-direct-primary href={item.href} aria-label={"直接打开"+item.name}/>
     <div className={styles.tileTop}><div className={styles.icon} aria-hidden="true">{item.icon}</div><div className={styles.tileMeta}><small>{item.product}</small><h3>{item.name}</h3></div></div>
     <p>{item.subtitle}</p><span className={styles.tileStatus}>{item.statusText}</span>
     <span className={styles.tileAction} aria-hidden="true">立即使用 <span>→</span></span>
    </article>)}
   </nav>
  </section>
  <p className={styles.entryNote}>点击整张卡片即可打开。付费和学习记录以实际开通功能为准。</p>

 </div>
}
