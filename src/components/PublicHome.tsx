"use client";
import Link from "next/link";
import { useSiteLanguage } from "@/lib/site-language";
import { PRIMARY_BUSINESS_NAV, type SiteBusinessId } from "@/lib/site-architecture";
import type { HomepageUpdate } from "@/lib/site-discovery";
import styles from "./PublicHome.module.css";
type HomeCounts={books:number;formalPapers:number;assessments:number;guides:number};
const COPY={
 zh:{hero:"学会岗位需要的能力，做好下一次求职准备。",intro:"选择目标岗位，学习真实技能，完成项目，再用笔试与面试检验掌握程度。",search:"搜索岗位、技能、课程、实训或模拟面试",searchButton:"全站搜索",quick:"立即开始",latest:"最近更新",latestNote:"按内容实际版本日期排列",kind:"按目标找服务",selected:"精选实训",all:"查看全部",open:"查看内容",records:"我的订单与记录",guide:"当前显示的更新均来自已发布内容的记录日期；价格、购买和下载以真实商品页面为准。"},
 en:{hero:"Build the skills your next job requires.",intro:"Choose a role, learn the skills, complete hands-on labs, and practice for interviews.",search:"Search roles, skills, labs or interview practice",searchButton:"Search",quick:"Start here",latest:"Recently updated",latestNote:"Sorted by verified content version dates",kind:"Explore by goal",selected:"Featured labs",all:"View all",open:"Explore",records:"My account",guide:"Updates use published source records. Purchases and downloads follow the actual product terms."},
} as const;
const HOT=["AI Agent","SQL","数据分析","Python","商品运营","面试"];
const QUICK=[
 {href:"/career",zh:"选择目标岗位",en:"Explore roles",descZh:"从校招或社招岗位出发",descEn:"Campus and experienced hires"},
 {href:"/learn",zh:"学习与实训",en:"Learn and practice",descZh:"免费导学与可运行项目",descEn:"Free guides and runnable labs"},
 {href:"/practice",zh:"模拟笔试与面试",en:"Mock tests and interviews",descZh:"按岗位完整模拟与复盘",descEn:"Job-relevant practice"},
] as const;
/* Homepage selects four useful storefront cards, not an alternative taxonomy. */
const SERVICE_DETAILS:Partial<Record<SiteBusinessId,{descZh:string;descEn:string;code:string}>>={
 career:{descZh:"校招与社招 · 选择岗位方向",descEn:"Find a role for your next move",code:"ROLES"},
 skills:{descZh:"免费导学 · 真实项目 · 可运行实训",descEn:"Guides, projects and runnable labs",code:"LEARN"},
 practice:{descZh:"正式模拟 · 结构化面试 · 报告",descEn:"Mocks, interviews and reports",code:"PRACTICE"},
};
const SERVICES=PRIMARY_BUSINESS_NAV.flatMap(item=>{
 const details=SERVICE_DETAILS[item.id];
 return details?[{...item,...details}]:[];
});
export default function PublicHome({updates,counts}:{updates:HomepageUpdate[];counts:HomeCounts}){
 const lang=useSiteLanguage(),t=COPY[lang];
 return <div data-site-shell="content" className={styles.portal}>
  <section className={styles.hero}>
   <div className={styles.heroMain}>
    <span className={styles.heroEyebrow}>SOC THINK / CAREERS · LEARNING · PRACTICE</span>
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
    <div className={styles.heroNumber}><strong>{counts.guides}</strong><span>{lang==="zh"?"份原创岗位资料":"original career guides"}</span></div>
    <Link href="/learn">{lang==="zh"?"进入学习与实训":"Explore learning"} ↗</Link>
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
  <p className={styles.pageNote}>{t.guide}</p>
 </div>;
}
