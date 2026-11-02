"use client";
import Link from "next/link";
import { EXAM_DIRECTORY } from "@/lib/exam-directory";
import { ASSESSMENT_DOMAINS } from "@/lib/assessment-platform";
import { useSiteLanguage } from "@/lib/site-language";
import type { HomepageUpdate } from "@/lib/site-discovery";
import styles from "./PublicHome.module.css";
type HomeCounts={books:number;formalPapers:number;assessments:number;guides:number};
const COPY={
 zh:{hero:"从一份试卷，到一项真正的能力。",intro:"找考试、查资料、做训练、读技术书。需要的内容，直接进入。",search:"搜索考试、试卷、技术书、岗位或课程",searchButton:"全站搜索",quick:"立即开始",latest:"最近更新",latestNote:"按内容实际版本日期排列",kind:"按目标找服务",selected:"精选实训",categories:"按考试类别查找",categoriesNote:"这里只列考试方向；职业岗位、技能实训和研究测评请使用各自栏目。筹备中的考试不代表已开放。",all:"查看全部",open:"查看内容",records:"我的订单与记录",guide:"当前显示的更新均来自已发布内容的记录日期；价格、购买和下载以真实商品页面为准。"},
 en:{hero:"From a practice paper to a skill you can use.",intro:"Find exams, papers, skill labs, and technical books. Start with real resources.",search:"Search exams, papers, technical books or career skills",searchButton:"Search",quick:"Start here",latest:"Recently updated",latestNote:"Sorted by verified content version dates",kind:"Explore by goal",selected:"Featured labs",categories:"Browse exam categories",categoriesNote:"Exam subjects only. Career services, skill labs and research assessments have separate hubs. Planned exams are not live.",all:"View all",open:"Explore",records:"My account",guide:"Updates use published source records. Purchases and downloads follow the actual product terms."},
} as const;
const HOT=["AMC","SQL","Agent","Rust","3D","采购"];
const QUICK=[
 {href:"/arithmetic",zh:"开始计算训练",en:"Start math practice",descZh:"小学到高中数学",descEn:"School mathematics"},
 {href:"/competitions",zh:"参加竞赛模拟",en:"Try mock exams",descZh:"按最新赛制练习",descEn:"Math competitions"},
 {href:"/resources",zh:"可用试卷资料",en:"Practice papers",descZh:"按年份和年级筛选",descEn:"Browse by year and grade"},
] as const;
const SERVICES=[
 {href:"/career",zh:"职业岗位",en:"Careers",descZh:"模拟笔试 · 原创复习资料",descEn:"Mock tests and original guides",code:"CAREER"},
 {href:"/skill-labs",zh:"技能实训",en:"Skill labs",descZh:"AI · SQL · 编程 · 3D",descEn:"AI, SQL, code and 3D",code:"LABS"},
 {href:"/assessment-center",zh:"测评中心",en:"Assessments",descZh:"逻辑训练 · 职业探索",descEn:"Reasoning and career interests",code:"MEASUREMENT"},
 {href:"/shop",zh:"数字商城",en:"Digital store",descZh:"查看在架资料和交付",descEn:"Published files and delivery",code:"STORE"},
] as const;
const DOMAINS=new Map(ASSESSMENT_DOMAINS.map(x=>[x.id,x]));
export default function PublicHome({updates,counts}:{updates:HomepageUpdate[];counts:HomeCounts}){
 const lang=useSiteLanguage(),t=COPY[lang];
 return <div data-site-shell="content" className={styles.portal}>
  <section className={styles.hero}>
   <div className={styles.heroMain}>
    <span className={styles.heroEyebrow}>SOC THINK / EXAMS · LEARNING · SKILLS</span>
    <h1>{t.hero}</h1>
    <p className={styles.heroLead}>{t.intro}</p>
    <form role="search" action="/search" method="get" className={styles.searchPanel}>
     <div className={styles.searchField}>
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
      <input id="portal-search" aria-label={t.search} type="search" name="q" placeholder={t.search} maxLength={100}/>
      <button type="submit" className={styles.searchGo}>{t.searchButton}</button>
     </div>
    </form>
    <div className={styles.popular}><span>{lang==="zh"?"搜索示例":"Examples"}</span>
      {HOT.map(q=><Link key={q} href={"/search?q="+encodeURIComponent(q)}>{q}</Link>)}
    </div>
   </div>
   <aside className={styles.heroAside}>
    <span className={styles.heroAsideTitle}>{lang==="zh"?"已开放内容":"PUBLISHED CONTENT"}</span>
    <div className={styles.heroNumber}><strong>{counts.formalPapers}</strong><span>{lang==="zh"?"套完整岗位模拟":"complete career mocks"}</span></div>
    <div className={styles.heroNumber}><strong>{counts.books}</strong><span>{lang==="zh"?"本精选技术书籍":"curated technical books"}</span></div>
    <div className={styles.heroNumber}><strong>{counts.assessments}</strong><span>{lang==="zh"?"项测评与训练":"assessments and tasks"}</span></div>
    <Link href="/skill-labs">{lang==="zh"?"进入技能实训":"Explore skill labs"} ↗</Link>
   </aside>
  </section>
  <section className={styles.quickSection} aria-labelledby="quick-services-heading">
   <div className={styles.sectionTop}><h2 id="quick-services-heading">{t.quick}</h2><Link href="/account">{t.records} →</Link></div>
   <div className={styles.quickGrid}>{QUICK.map((item,i)=>
    <Link href={item.href} className={styles.quickItem} key={item.href}>
     <span className={styles.quickNumber}>{String(i+1).padStart(2,"0")}</span>
     <div><strong>{item[lang]}</strong><small>{lang==="zh"?item.descZh:item.descEn}</small></div>
     <span className={styles.quickArrow} aria-hidden="true">↗</span>
    </Link>)}</div>
  </section>
  <section className={styles.updates} aria-labelledby="home-updates-heading">
   <div className={styles.sectionTop}><div><h2 id="home-updates-heading">{t.latest}</h2><p>{t.latestNote}</p></div></div>
   <div className={styles.updateGrid}>{updates.map(item=><article className={styles.updateCard} key={item.id}>
    <div className={styles.updateMeta}><span>{item.kind}</span><time dateTime={item.date}>{item.date.replaceAll("-",".")}</time></div>
    <h3><Link href={item.href}>{item.title}</Link></h3>
    <p>{item.summary}</p><Link href={item.href} className={styles.actionLink}>{t.open} →</Link>
   </article>)}</div>
  </section>
  <section className={styles.serviceSection} aria-labelledby="home-services-heading">
   <div className={styles.sectionTop}><h2 id="home-services-heading">{t.kind}</h2></div>
   <div className={styles.serviceGrid}>{SERVICES.map(service=><Link href={service.href} className={styles.serviceCard} key={service.href}>
    <span className={styles.serviceCode}>{service.code}</span>
    <strong>{service[lang]}</strong><p>{lang==="zh"?service.descZh:service.descEn}</p>
    <span className={styles.serviceArrow} aria-hidden="true">→</span>
   </Link>)}</div>
  </section>
  <section className={styles.featureSection} aria-labelledby="home-featured-heading">
   <div className={styles.sectionTop}><h2 id="home-featured-heading">{t.selected}</h2><Link href="/skill-labs">{t.all} →</Link></div>
   <div className={styles.featureGrid}>
    <article className={styles.featureDark}>
     <span>AI / AGENT</span><h3>{lang==="zh"?"AI Agent 工程实战":"Practical AI Agent engineering"}</h3>
     <p>{lang==="zh"?"6 节课程、真实 Python 源码、独立验收与 24 题岗位模拟。":"Six lessons, runnable Python code and a 24-question career mock."}</p>
     <div><Link href="/skill-labs/agent-foundations">{lang==="zh"?"进入课程":"Open course"} →</Link>
      <Link href="/career/exams/agent-engineering-paper-2026q4-v1">{lang==="zh"?"模拟笔试":"Mock exam"} →</Link></div>
    </article>
    <article className={styles.featureLight}>
     <span>THREE.JS / WEBGPU</span><h3>{lang==="zh"?"3D 实验与源码交付":"3D labs and source code"}</h3>
     <p>{lang==="zh"?"8 个教学单元、交互式 3D 场景，配套技术书籍和源码。":"Eight modules, an interactive scene and related technical books."}</p>
     <div><Link href="/skill-labs/webgpu-basics">{lang==="zh"?"运行实验":"Open lab"} →</Link>
      <Link href="/skill-labs/books">{lang==="zh"?"配套技术书库":"Related technical library"} →</Link></div>
    </article>
   </div>
  </section>
  <section className={styles.categoryOverview} aria-labelledby="exam-category-overview">
   <div className={styles.sectionTop}><h2 id="exam-category-overview">{t.categories}</h2><Link href="/assessments">{t.all} →</Link></div>
   <div className={styles.categoryGrid}>{EXAM_DIRECTORY.map(group=><Link href={"/assessments#domain-"+group.domainId}
    className={styles.categoryCard} key={group.domainId} title={DOMAINS.get(group.domainId)!.name[lang]}>
     <strong>{DOMAINS.get(group.domainId)!.navName[lang]}</strong><span aria-hidden="true">↗</span>
    </Link>)}</div>
   <p className={styles.categoryNote}>{t.categoriesNote}</p>
  </section>
  <p className={styles.pageNote}>{t.guide}</p>
 </div>;
}
