import Link from "next/link";
import type {Metadata} from "next";
import {ENGLISH_SPEAKING_ROOT,SPEAKING_REGIONS,regionPath} from "@/lib/english-speaking-regions";
import styles from "./english-speaking.module.css";
export const metadata:Metadata={title:"全国中考英语听说考试中心｜武汉·北京·上海·广州｜SOC THINK",description:"按城市和年份进入独立英语听说备考专版，查看考试规则、原创模拟卷与专项训练。",alternates:{canonical:ENGLISH_SPEAKING_ROOT}};
export default function EnglishSpeakingExamCenter(){
 return <div className={styles.page} data-testid="english-speaking-exam-center">
  <nav className={styles.crumbs} aria-label="当前位置"><Link href="/">首页</Link><span>/</span><Link href="/assessments">考试中心</Link><span>/</span><span aria-current="page">英语听说</span></nav>
  <header className={styles.hero}><p className={styles.eyebrow}>SOC THINK · LANGUAGE EXAMS</p><h1>全国英语听说考试中心</h1><p>选择所在城市和考试年份，进入专属备考页面。不同地区题型、规则和训练卷独立管理。</p><div className={styles.heroLinks}><a href="#papers">选择城市</a><Link href="/english/pronunciation/app/practice-library">发音与纠音</Link></div></header>
  <section className={styles.list} id="papers"><h2>城市备考专版</h2><div className={styles.cards}>{SPEAKING_REGIONS.map(r=><article className={styles.card} key={r.paperId}><span className={styles.kicker}>{r.status}</span><h3>{r.cityName} {r.year}</h3><p>{r.summary}</p><small>{r.facts.slice(0,2).map(([k,v])=>k+"："+v).join(" · ")}</small><Link href={regionPath(r)}>进入{r.cityName}专版 →</Link></article>)}</div></section>
  <section className={styles.quick} aria-labelledby="trial-heading"><div><span className={styles.kicker}>通用体验</span><h2 id="trial-heading">原创9题听说试测</h2><p>5道听力理解＋4道朗读，不对应任何城市的正式考试。</p></div><Link href="/english/pronunciation/app/exam-trial">开始试测 →</Link></section>
  <section className={styles.retrain}><div><h2>跨地区综合训练</h2><p>复用听力、朗读、应答和表达能力训练；不跨地区换算正式考试分数。</p></div><Link href="/english/pronunciation/app/exam-simulator?paper=integrated&pack=A&mode=simulation">进入综合模拟 →</Link></section>
  <p className={styles.note}>各城市专版为独立原创教学服务，不是官方样卷、官方客户端或官方等值评分。</p>
 </div>;
}
