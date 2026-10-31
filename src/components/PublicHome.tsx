"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {ASSESSMENT_DOMAINS,type AssessmentDomainId} from "@/lib/assessment-platform";
import {EXAM_DIRECTORY} from "@/lib/exam-directory";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./PublicHome.module.css";

const TEXT={
  zh:{
    eyebrow:"SOCTHINK · 考试与学习资源平台",title:"找考试，查资料，立即开练。",subtitle:"从小升初到职业资格，一站找到考试、真题资料与学习训练。",
    description:"七大考试领域统一分类。可用内容直接开练，尚在建设的项目清晰标记，不让你在空白页面里反复寻找。",
    search:"搜索考试名称、学科或关键词，例如 AMC、雅思、考研、SQL",
    searchLabel:"搜索考试",searchTitle:"从一项考试开始",popular:"大家常找",found:"搜索结果",
    categories:"考试大类",directions:"考试方向",liveServices:"已开放的领域",enter:"立即使用",
    jump:"查看全部考试",papers:"检索试卷资料",signIn:"微信登录 / 注册",tools:"直达可用服务",
    topics:"分类详情与可用服务",partial:"部分服务开放",pending:"内容准备中",ready:"已可使用",
    source:"仅链接真实可用内容，未验收服务不会显示考试或购买入口。",
    browseByType:"按考试类别找",browseHint:"先选所属考试领域，再查看该领域有哪些具体考试。",categoryAction:"查看全部方向",countSuffix:"个方向",
    noResults:"没有找到对应分类，请换一个关键词试试。",clear:"清空搜索",viewAll:"查看所有方向",
    liveMath:"开始计算训练",liveMathDesc:"小学到高中，直接进入现有在线数学训练。",
    liveCompetition:"参加竞赛模拟",liveCompetitionDesc:"按赛制选择比赛，进入现有模拟与练习。",
    livePaper:"可用试卷资料",livePaperDesc:"根据竞赛、年份、年级筛选已有训练卷。",
    stages:"一条完整的学习路径",stageDesc:"同一内容体系，连通发现、练习、诊断和复测。",
    step1:"查考试",step1d:"先找到适合自己的考试及资料",
    step2:"做练习",step2d:"免费体验和正式考试清晰分开",
    step3:"看解析",step3d:"核对成绩、答案与薄弱知识",
    step4:"再提高",step4d:"复练错题，沉淀长期学习记录",
    guidance:"分类目录不是可购买库存；所有试卷仍需分别核验内容来源、使用授权和服务可用性。",
  },
  en:{
    eyebrow:"SOCTHINK · Exams and Learning Resources",title:"Find the exam. Start learning.",
    subtitle:"From school exams to professional qualifications, explore papers and practice in one place.",
    description:"Seven exam domains under one coherent directory. Available content opens directly; unfinished products never lead to dead-end checkout pages.",
    search:"Search exam, subject or keyword: AMC, IELTS, postgraduate, SQL",
    searchLabel:"Search exams",searchTitle:"Start with one exam",popular:"Popular searches",found:"Search results",
    categories:"Exam categories",directions:"Exam directions",liveServices:"Live domains",enter:"Open",
    jump:"Browse all exams",papers:"Search practice papers",signIn:"Sign in / Join with WeChat",tools:"Services ready now",
    topics:"Exams and exercises",partial:"Some services available",pending:"In preparation",ready:"Available now",
    source:"Only real destinations are linked; unverified exams are not open or for sale.",
    browseByType:"Browse by exam category",browseHint:"Choose a subject area first, then see its specific exams.",categoryAction:"Explore this category",countSuffix:"directions",
    noResults:"No matching categories. Try another keyword.",clear:"Clear search",viewAll:"See all exam directions",
    liveMath:"Start math practice",liveMathDesc:"Use the existing school mathematics practice.",
    liveCompetition:"Try mock exams",liveCompetitionDesc:"Select authentic formats and practise existing mocks.",
    livePaper:"Training-ready paper library",livePaperDesc:"Filter existing papers by contest, grade or year.",
    stages:"One connected learning journey",stageDesc:"Discover, attempt, understand and improve within one platform.",
    step1:"Find",step1d:"Find the right exam and resources",
    step2:"Practise",step2d:"Try available practice or an exam",
    step3:"Review",step3d:"Understand scores and answers",
    step4:"Improve",step4d:"Retest and retain your learning history",
    guidance:"Directory entries are not a sellable inventory. Each paper still needs verified rights, content and delivery.",
  },
} as const;
const POPULAR=[
  {zh:"小升初",en:"School admissions",q:"小升初"},
  {zh:"袋鼠数学",en:"Math Kangaroo",q:"kangaroo"},
  {zh:"雅思",en:"IELTS",q:"ielts"},
  {zh:"公务员",en:"Civil service",q:"公务员"},
  {zh:"考研",en:"Postgraduate",q:"考研"},
  {zh:"SQL",en:"SQL",q:"SQL"},
] as const;
const QUICK_SERVICES=[
  {href:"/arithmetic",key:"liveMath",description:"liveMathDesc",number:"01"},
  {href:"/competitions",key:"liveCompetition",description:"liveCompetitionDesc",number:"02"},
  {href:"/resources",key:"livePaper",description:"livePaperDesc",number:"03"},
] as const;
const DIR_TOTAL=EXAM_DIRECTORY.reduce((a,x)=>a+x.topics.length,0);
const DOMAINS=new Map(ASSESSMENT_DOMAINS.map(x=>[x.id,x]));

export default function PublicHome(){
  const lang=useSiteLanguage(),t=TEXT[lang];
  const [active,setActive]=useState<AssessmentDomainId>("school");
  const [search,setSearch]=useState("");
  const query=search.trim().toLocaleLowerCase();
  const matching=useMemo(()=>{
    const groups=EXAM_DIRECTORY.filter(g=>!query||g.topics.some(topic=>
      [topic.id,topic.title.zh,topic.title.en].some(s=>s.toLocaleLowerCase().includes(query)))||
      [DOMAINS.get(g.domainId)?.name.zh,DOMAINS.get(g.domainId)?.name.en]
        .some(s=>(s||"").toLocaleLowerCase().includes(query)));
    return (query?groups:groups.filter(x=>x.domainId===active)).map(group=>{
      const domain=DOMAINS.get(group.domainId)!;
      const whole=domain.name.zh.toLocaleLowerCase().includes(query)||domain.name.en.toLocaleLowerCase().includes(query);
      return {domain,topics:query&&!whole?group.topics.filter(topic=>
        [topic.id,topic.title.zh,topic.title.en].some(s=>s.toLocaleLowerCase().includes(query))):group.topics};
    });
  },[active,query]);
  const liveDomains=ASSESSMENT_DOMAINS.filter(x=>x.readiness==="live").length;
  const steps=[
    [t.step1,t.step1d],[t.step2,t.step2d],
    [t.step3,t.step3d],[t.step4,t.step4d],
  ] as const;

  return <div data-site-shell="content" className={styles.portal}>
    <section className={styles.hero}>
      <div className={styles.heroMain}>
        <div className={styles.heroEyebrow}><span className={styles.eyebrowDot}/> {t.eyebrow}</div>
        <h1>{lang==="zh"?<>找考试，查资料，<span>立即开练。</span></>:t.title}</h1>
        <p className={styles.heroLead}>{t.subtitle}</p>
        <p className={styles.heroBody}>{t.description}</p>
        <div className={styles.searchPanel}>
          <label htmlFor="portal-search">{t.searchTitle}</label>
          <form className={styles.searchField} action="/assessments" method="get" role="search">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
            <input id="portal-search" type="search" name="q" maxLength={160} value={search} placeholder={t.search}
              aria-label={t.searchLabel} onChange={e=>setSearch(e.target.value)}/>
            <button type="submit" className={styles.searchGo}>{t.jump}</button>
          </form>
          <div className={styles.popular}><span>{t.popular}</span>
            {POPULAR.map(item=><Link key={item.zh} href={`/assessments?q=${encodeURIComponent(item.q)}`}>{item[lang]}</Link>)}
          </div>
        </div>
      </div>
      <aside className={styles.heroAside} aria-label={t.categories}>
        <div className={styles.overline}>EXAM INDEX / 学习导航</div>
        <div className={styles.heroMeasure}><strong>{EXAM_DIRECTORY.length}</strong><span>{t.categories}</span></div>
        <div className={styles.heroDivider}/>
        <div className={styles.heroMeasure}><strong>{DIR_TOTAL}</strong><span>{t.directions}</span></div>
        <div className={styles.heroDivider}/>
        <div className={styles.heroMeasure}><strong>{liveDomains}</strong><span>{t.liveServices}</span></div>
        <p>{t.guidance}</p>
      </aside>
    </section>

    <section className={styles.categoryOverview} aria-labelledby="exam-category-overview">
      <div className={styles.sectionTop}>
        <div><span className={styles.micro}>EXAM CATEGORIES / 7 DOMAINS</span>
          <h2 id="exam-category-overview">{t.browseByType}</h2>
          <p className={styles.categoryIntro}>{t.browseHint}</p>
        </div>
        <Link href="/assessments">{t.viewAll} →</Link>
      </div>
      <div className={styles.categoryGrid}>
        {EXAM_DIRECTORY.map(group=>{
          const domain=DOMAINS.get(group.domainId)!;
          const available=group.topics.filter(topic=>topic.status==="live").length;
          return <Link key={group.domainId} href={`/assessments#domain-${group.domainId}`}
            className={styles.categoryCard}>
            <span className={styles.categoryCardMeta}>{group.topics.length} {t.countSuffix}
              <span className={available?styles.categoryLive:styles.categoryPending}>
                {available?t.partial:t.pending}
              </span>
            </span>
            <strong>{domain.name[lang]}</strong>
            <span className={styles.categoryExamples}>{group.topics.slice(0,3).map(topic=>topic.title[lang]).join(" · ")}</span>
            <span className={styles.categoryLink}>{t.categoryAction} →</span>
          </Link>;
        })}
      </div>
    </section>

    <section className={styles.quickSection} aria-labelledby="quick-services-heading">
      <div className={styles.sectionTop}><h2 id="quick-services-heading">{t.tools}</h2>
        <Link href="/login">{t.signIn} <span aria-hidden="true">→</span></Link></div>
      <div className={styles.quickGrid}>{QUICK_SERVICES.map(s=>
        <Link key={s.href} href={s.href} className={styles.quickItem}>
          <span className={styles.quickNumber}>{s.number}</span><div><strong>{t[s.key]}</strong><p>{t[s.description]}</p></div>
          <span className={styles.quickArrow} aria-hidden="true">↗</span>
        </Link>)}</div>
    </section>

    <section className={styles.directory} id="portal-directory" aria-labelledby="directory-heading">
      <div className={styles.sectionTop}><div><span className={styles.micro}>EXPLORE / DIRECTORY</span>
          <h2 id="directory-heading">{query?t.found:t.topics}</h2></div>
        <Link href="/assessments">{t.viewAll} →</Link></div>
      <div className={styles.workspace}>
        <nav className={styles.sidebar} aria-label={t.categories}>
          <div className={styles.sidebarTitle}>{t.categories}</div>
          {EXAM_DIRECTORY.map((g,i)=>{
            const domain=DOMAINS.get(g.domainId)!;
            return <button type="button" key={g.domainId}
              className={!query&&active===g.domainId?styles.sideActive:styles.sideItem}
              aria-pressed={!query&&active===g.domainId}
              onClick={()=>{setActive(g.domainId);setSearch("");}}>
              <span className={styles.sideNumber}>{String(i+1).padStart(2,"0")}</span>
              <span>{domain.name[lang]}</span>
              <span className={styles.sideCount}>{g.topics.length}</span>
            </button>;
          })}
          <div className={styles.sidebarHint}>{t.source}</div>
        </nav>
        <div className={styles.resultArea} aria-live="polite">
          {!matching.length?<div className={styles.empty}><p>{t.noResults}</p>
            <button type="button" onClick={()=>setSearch("")}>{t.clear}</button></div>:
          matching.map(({domain,topics})=><section key={domain.id} className={styles.group}>
            <div className={styles.groupHead}>
              <div><h3>{domain.name[lang]}</h3><p>{domain.summary[lang]}</p></div>
              <span className={domain.readiness==="live"?styles.avail:styles.planned}>
                {domain.readiness==="live"?t.partial:t.pending}
              </span>
            </div>
            <div className={styles.topicGrid}>{topics.map(topic=>topic.href?
              <Link key={topic.id} className={styles.topicLive} href={topic.href}>
                <strong>{topic.title[lang]}</strong><span>{t.ready} ↗</span></Link>:
              <div className={styles.topicPlanned} key={topic.id}>
                <strong>{topic.title[lang]}</strong><span>{t.pending}</span></div>)}</div>
          </section>)}
        </div>
      </div>
    </section>

    <section className={styles.journey}>
      <div className={styles.journeyHead}><span className={styles.micro}>LEARN / PROGRESS</span>
        <h2>{t.stages}</h2><p>{t.stageDesc}</p></div>
      <div className={styles.steps}>{steps.map(([title,description],i)=>
        <div key={title} className={styles.step}><span>{String(i+1).padStart(2,"0")}</span>
          <h3>{title}</h3><p>{description}</p></div>)}</div>
    </section>
  </div>;
}
