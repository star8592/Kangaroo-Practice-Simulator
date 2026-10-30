"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {ASSESSMENT_DOMAINS} from "@/lib/assessment-platform";
import {EXAM_DIRECTORY} from "@/lib/exam-directory";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./ExamDirectory.module.css";

const LABEL={
  zh:{
    eyebrow:"EXAM DIRECTORY",
    title:"全部考试，一站查找",
    description:"按学段、考试和技能方向找内容。已开放项目可以直接练习；筹备中的栏目先展示清楚，只有可核实的试卷和服务才开放使用。",
    search:"搜索考试，如：小升初、AMC、雅思、公考、SQL",
    live:"可直接使用",pending:"内容建设中",more:"查看本栏目全部考试",
    resources:"查找真实练习卷",exams:"进入在线考试",event:"全球赛事管家",
    empty:"暂未匹配到考试分类，可以换个关键词试试。",
    count:"考试方向",categories:"大类",
  },
  en:{
    eyebrow:"EXAM DIRECTORY",
    title:"Find any exam in one place",
    description:"Browse by school stage, examination or skill. Live topics open real practice; planned sections are clearly labelled and never sold as finished products.",
    search:"Search exams, e.g. AMC, IELTS, SQL",
    live:"Available",pending:"Coming later",more:"See every topic in this category",
    resources:"Find practice papers",exams:"Start an assessment",event:"Competition companion",
    empty:"No matching exam categories. Try another keyword.",
    count:"topics",categories:"categories",
  },
} as const;

export default function ExamDirectory({compact=false}:{compact?:boolean}){
  const lang=useSiteLanguage(),t=LABEL[lang];
  const [query,setQuery]=useState("");
  const shown=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase();
    return EXAM_DIRECTORY.map(group=>{
      const domain=ASSESSMENT_DOMAINS.find(x=>x.id===group.domainId)!;
      const matchesDomain=[domain.name.zh,domain.name.en,domain.summary.zh,domain.summary.en]
        .some(x=>x.toLocaleLowerCase().includes(term));
      const relevant=!term||matchesDomain?group.topics:group.topics.filter(x=>
        [x.title.zh,x.title.en,x.id].some(v=>v.toLocaleLowerCase().includes(term)));
      return {domain,topics:compact&&!term?relevant.slice(0,4):relevant,allCount:group.topics.length};
    }).filter(x=>x.topics.length>0);
  },[query,compact]);
  const count=EXAM_DIRECTORY.reduce((sum,group)=>sum+group.topics.length,0);
  return <section className={styles.section} aria-label={t.title} id="exam-directory">
    <header className={styles.heading}>
      <div className={styles.eyebrow}>{t.eyebrow}</div>
      <h2>{t.title}</h2>
      <p>{t.description}</p>
      <div className={styles.metrics}><span><strong>{EXAM_DIRECTORY.length}</strong> {t.categories}</span>
        <span><strong>{count}</strong> {t.count}</span></div>
    </header>
    {!compact&&<label className={styles.search}>
      <span className={styles.visuallyHidden}>{t.search}</span>
      <input type="search" value={query} placeholder={t.search}
        onChange={e=>setQuery(e.target.value)}/>
    </label>}
    <div className={styles.grid}>
      {shown.map(({domain,topics,allCount})=><article className={styles.card}
        id={compact?undefined:`domain-${domain.id}`} key={domain.id}>
        <header className={styles.cardHeader}>
          <div className={styles.label}>{domain.audience[lang]}</div>
          <span className={domain.readiness==="live"?styles.statusLive:styles.statusPlanned}>
            {domain.readiness==="live"?t.live:t.pending}
          </span>
        </header>
        <h3>{domain.name[lang]}</h3>
        <p>{domain.summary[lang]}</p>
        <div className={styles.topics}>
          {topics.map(topic=>topic.href?<Link href={topic.href} key={topic.id}
            className={styles.topicLive}>{topic.title[lang]}<span aria-hidden="true"> ↗</span></Link>:
            <span key={topic.id} className={styles.topicPlanned}
              title={t.pending}>{topic.title[lang]}</span>)}
        </div>
        {compact&&allCount>topics.length&&<Link className={styles.more}
          href={`/assessments#domain-${domain.id}`}>{t.more}</Link>}
        {!compact&&domain.readiness==="live"&&<div className={styles.available}>
          {domain.liveRoutes.map(link=><Link key={link.href} href={link.href}>
            {link.title[lang]} →</Link>)}
        </div>}
      </article>)}
    </div>
    {!shown.length&&<p className={styles.empty}>{t.empty}</p>}
    <nav className={styles.actions} aria-label={lang==="zh"?"使用入口":"Live services"}>
      <Link href="/resources">{t.resources}</Link>
      <Link href="/competitions">{t.exams}</Link>
      <Link href="/events">{t.event}</Link>
    </nav>
  </section>;
}
