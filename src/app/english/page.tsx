import Link from "next/link";
import type {Metadata} from "next";
import {ENGLISH_PRODUCTS} from "@/lib/english-products";
import styles from "./english.module.css";

export const metadata:Metadata={
 title:"英语学习｜少儿绘本·发音·词汇·分级阅读｜SOC THINK",
 description:"SOC THINK 英语学习：少儿绘本、AccentLab 听说训练、单词课堂和 AelOS 阅读驱动学习。旧 EnglishLeap 保留备份入口。",
 alternates:{canonical:"/english"},
};

// The public hub presents three distinct learning products plus the free children's reader.
// EnglishLeap is a legacy backup route, not a second reading product or a fake exam center.
const ENGLISH_DIRECT_ENTRIES=ENGLISH_PRODUCTS.flatMap(item=>item.id==="reading" ? [
 {id:"kids",name:"少儿英语绘本",product:"英语阅读 · 小小阅读星球",subtitle:"小学 1—6 年级 · 看图听故事 · 点触互动",statusText:"72 篇原创故事 · 免费开放",href:"/english/reading/kids/",icon:"📖"},
] : [
 {id:item.id,name:item.name,product:item.product,subtitle:item.subtitle,statusText:item.statusText,href:item.serviceUrl,icon:item.icon},
]);
export default function EnglishHub(){
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="英语学习路径"><Link href="/">SOC THINK</Link><span>/</span><span aria-current="page">英语学习</span></nav>
  <header className={styles.hero}>
   <span className={styles.kicker}>SOC THINK · ENGLISH</span>
   <h1>英语学习</h1>
   <p>直接选择：少儿绘本、听说训练与免费原创试测、词汇学习或 AelOS 分级阅读。不同产品各自专注，避免重复工作台。</p>
  </header>
  <section className={styles.roleEntry} aria-labelledby="english-teacher-entry">
    <div><h2 id="english-teacher-entry">英语课堂</h2>
      <p>学生从老师分享的作业链接直接练习；教师统一微信登录后，仅看到自己获授权的管理模块。每个产品继续独立核验真实任课班级。</p></div>
    <div className={styles.roleActions}>
      <Link href="/workspace">我是老师 · 我的管理工作台</Link>
      <Link href="/english/pronunciation/app/exam-trial">免费英语听说试测 · 9题</Link>
    </div>
  </section>
  <section aria-labelledby="english-choose">
   <div className={styles.headerRow}><h2 id="english-choose">选择学习内容</h2><p>三个专业产品 · 少儿绘本入口</p></div>
   <nav className={styles.grid} aria-label="英语学习直达入口">
    {ENGLISH_DIRECT_ENTRIES.map(item=><article className={styles.tile+" direct-entry-card"} key={item.id}><Link className="direct-entry-hit" data-direct-primary href={item.href} aria-label={"直接打开"+item.name}/>
     <div className={styles.tileTop}><div className={styles.icon} aria-hidden="true">{item.icon}</div><div className={styles.tileMeta}><small>{item.product}</small><h3>{item.name}</h3></div></div>
     <p>{item.subtitle}</p><span className={styles.tileStatus}>{item.statusText}</span>
     <span className={styles.tileAction} aria-hidden="true">立即使用 <span>→</span></span>
    </article>)}
   </nav>
  </section>
  <p className={styles.entryNote}>选择学习内容即可进入。学生的班级作业以老师分享的专属链接为准。旧 EnglishLeap 用户可前往 <Link href="/english/reading">历史学习记录与备份入口</Link>，现有笔记不自动迁移。</p>

 </div>
}
