"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {ASSESSMENT_DOMAINS} from "@/lib/assessment-platform";
import {EXAM_DIRECTORY} from "@/lib/exam-directory";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./ExamDirectory.module.css";

const LABEL={
  zh:{
    eyebrow:"EXAM INDEX / 全国考试导航",
    title:"全部考试，一站查找",
    description:"按考试领域、学科和方向查找。可以使用的服务直接打开，建设中的方向不显示虚假考试和购买入口。",
    search:"搜索考试名称、考试方向或关键词",submit:"搜索",all:"考试分类",topics:"考试方向",
    ready:"立即使用",soon:"内容准备中",available:"部分内容已开放",
    empty:"没有找到相关考试方向，请调整搜索条件。",reset:"清空",
    count:"考试方向",categories:"考试大类",more:"查看可用练习卷",
    browse:"真实试卷资料",calendar:"全球赛事管家",
  },
  en:{
    eyebrow:"EXAM INDEX / ALL CATEGORIES",
    title:"Find any exam in one place",
    description:"Browse exam areas, subjects and topics. Open real practice immediately; planned exams never lead to fictional checkouts.",
    search:"Search exam, subject or keyword",submit:"Search",all:"Categories",topics:"Exam directions",
    ready:"Open practice",soon:"Coming later",available:"Some services available",
    empty:"No matching exams. Try another keyword.",reset:"Clear",
    count:"directions",categories:"exam categories",more:"Find available practice papers",
    browse:"Available papers",calendar:"Competition calendar",
  },
} as const;

const DOMAIN_BY_ID=new Map(ASSESSMENT_DOMAINS.map(d=>[d.id,d]));
const TOTAL=EXAM_DIRECTORY.reduce((sum,group)=>sum+group.topics.length,0);

export default function ExamDirectory({initialQuery=""}:{initialQuery?:string}){
  const lang=useSiteLanguage(),t=LABEL[lang];
  const [query,setQuery]=useState(initialQuery);
  const matched=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase();
    return EXAM_DIRECTORY.map(group=>{
      const domain=DOMAIN_BY_ID.get(group.domainId)!;
      const inDomain=[domain.name.zh,domain.name.en,domain.summary.zh,domain.summary.en]
        .some(v=>v.toLocaleLowerCase().includes(term));
      const topics=term&&!inDomain?group.topics.filter(topic=>
        [topic.id,topic.title.zh,topic.title.en].some(v=>v.toLocaleLowerCase().includes(term))):group.topics;
      return {domain,topics};
    }).filter(group=>group.topics.length>0);
  },[query]);
  return <section className={styles.section} aria-label={t.title} id="exam-directory">
    <header className={styles.heading}>
      <div className={styles.eyebrow}>{t.eyebrow}</div>
      <div className={styles.headingRow}>
        <div><h2>{t.title}</h2><p>{t.description}</p></div>
        <div className={styles.metrics}><span><strong>{ASSESSMENT_DOMAINS.length}</strong>{t.categories}</span>
          <span><strong>{TOTAL}</strong>{t.count}</span></div>
      </div>
      <div className={styles.searchBar}>
        <label htmlFor="exam-directory-search">{t.search}</label>
        <form method="get" action="/assessments"><svg width="20" height="20" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
          <input id="exam-directory-search" type="search" name="q" maxLength={160} value={query} placeholder={t.search}
            onChange={e=>setQuery(e.target.value)}/>
          {query&&<button type="button" onClick={()=>setQuery("")}>{t.reset}</button>}
          <button type="submit">{t.submit}</button>
        </form>
      </div>
    </header>
    <div className={styles.layout}>
      <nav className={styles.side} aria-label={t.all}>
        <span className={styles.sideTitle}>{t.all}</span>
        {EXAM_DIRECTORY.map((group,i)=>{
          const domain=DOMAIN_BY_ID.get(group.domainId)!;
          return <a key={group.domainId} href={`#domain-${group.domainId}`}
            onClick={()=>setQuery("")}>
            <span>{String(i+1).padStart(2,"0")}</span>
            <strong>{domain.name[lang]}</strong><em>{group.topics.length}</em>
          </a>;
        })}
      </nav>
      <div className={styles.groups} aria-live="polite">
        {!matched.length&&<div className={styles.empty}>{t.empty}</div>}
        {matched.map(({domain,topics})=><article className={styles.group}
          id={`domain-${domain.id}`} key={domain.id}>
          <div className={styles.groupTop}>
            <div><h3>{domain.name[lang]}</h3><p>{domain.summary[lang]}</p></div>
            <span className={domain.readiness==="live"?styles.live:styles.pending}>
              {domain.readiness==="live"?t.available:t.soon}
            </span>
          </div>
          <div className={styles.topics}>
            {topics.map(topic=>topic.href?<Link href={topic.href} key={topic.id}
              className={styles.topicLive}><span>{topic.title[lang]}</span><small>{t.ready} ↗</small></Link>:
              <div key={topic.id} className={styles.topicPending}><span>{topic.title[lang]}</span><small>{t.soon}</small></div>)}
          </div>
          {domain.readiness==="live"&&<div className={styles.realLinks}>
            {domain.liveRoutes.map(route=><Link href={route.href} key={route.href}>{route.title[lang]} →</Link>)}
          </div>}
        </article>)}
      </div>
    </div>
    <nav className={styles.actions} aria-label={lang==="zh"?"可用服务":"Available services"}>
      <Link href="/resources">{t.browse}</Link><Link href="/events">{t.calendar}</Link>
    </nav>
  </section>;
}
