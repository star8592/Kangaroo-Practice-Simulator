"use client";
import Link from "next/link";
import { useSiteLanguage } from "@/lib/site-language";
import { PRIMARY_BUSINESS_NAV, type SiteBusinessId } from "@/lib/site-architecture";
import type { HomepageUpdate } from "@/lib/site-discovery";
import { CAREER_PATHS } from "@/lib/career-paths";
import styles from "./PublicHome.module.css";
type HomeCounts={books:number;formalPapers:number;assessments:number;guides:number};
const COPY={
 zh:{hero:"为下一份工作，练出真本事。",intro:"选一个岗位，先体验真实课程、实操与模拟。需要更深入的服务时，再看清价格和交付内容。",search:"搜索岗位、技能、课程、实训或模拟面试",searchButton:"全站搜索",quick:"按你的目标开始",latest:"最近更新",latestNote:"按内容实际版本日期排列",kind:"按目标找服务",selected:"精选实训",all:"查看全部",open:"查看内容",records:"我的订单与记录",guide:"当前显示的更新均来自已发布内容的记录日期；价格、购买和下载以真实商品页面为准。"},
 en:{hero:"Build skills for your next job.",intro:"Choose a role, try real lessons, labs and mocks. Pay for deeper services only when their pricing and deliverables are published.",search:"Search roles, skills, labs or interview practice",searchButton:"Search",quick:"Choose your next step",latest:"Recently updated",latestNote:"Sorted by verified content version dates",kind:"Explore by goal",selected:"Featured labs",all:"View all",open:"Explore",records:"My account",guide:"Updates use published source records. Purchases and downloads follow the actual product terms."},
} as const;
const HOT=["AI Agent","SQL","数据分析","Python","商品运营","面试"];
/* Derive the 3 task cards from the one canonical navigation registry. */
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
    <div className={styles.heroActions} aria-label={lang==="zh"?"开始职业训练":"Start a career track"}>
      <Link className={styles.heroPrimary} href="/career/paths">{lang==="zh"?"选择岗位训练":"Explore career tracks"} <span aria-hidden="true">→</span></Link>
      <Link className={styles.heroSecondary} href="/practice">{lang==="zh"?"先做一次模拟":"Try a mock first"}</Link>
    </div>
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
  <nav className={styles.audienceNav} aria-label={lang==="zh"?"按求职阶段找服务":"Find by career stage"}>
    <strong>{lang==="zh"?"你目前属于哪一种？":"Your career stage"}</strong>
    <Link href="/career/paths?audience=campus">{lang==="zh"?"校招 / 应届生":"Campus / graduate"} <span aria-hidden="true">→</span></Link>
    <Link href="/career/paths?audience=social">{lang==="zh"?"社招 / 转岗":"Experienced / switching"} <span aria-hidden="true">→</span></Link>
    <span>{lang==="zh"?"不同阶段看不同的训练环节":"A focused journey for each stage"}</span>
  </nav>
  <section className={styles.pathSection} aria-labelledby="home-paths-heading">
    <div className={styles.sectionTop}>
      <div><span className={styles.sectionEyebrow}>{lang==="zh"?"真实可用的产品":"AVAILABLE TRAINING"}</span>
        <h2 id="home-paths-heading">{lang==="zh"?"从这些岗位直接开始":"Start with these career tracks"}</h2></div>
      <Link href="/career/paths">{lang==="zh"?"全部职业路线":"All career tracks"} →</Link>
    </div>
    <div className={styles.pathGrid}>
      {CAREER_PATHS.map((path,i)=>{
        const live=path.steps.filter(s=>s.status==="live");
        const first=live.find(s=>s.stage==="lab")??live[0];
        return <article className={styles.pathCard} key={path.slug}>
          <div className={styles.pathTop}><span>{String(i+1).padStart(2,"0")} / {lang==="zh"?"岗位训练":"CAREER PATH"}</span>
            <span>{lang==="zh"?"有可用课程":"AVAILABLE NOW"}</span></div>
          <h3><Link href={"/career/paths/"+path.slug}>{path.title}</Link></h3>
          <p>{path.subtitle}</p>
          <div className={styles.pathTags}>{path.recommendedFor.slice(0,2).map(role=><span key={role}>{role}</span>)}</div>
          <div className={styles.pathBottom}>
            <span>{lang==="zh"?`${live.length} 个环节可直接开始`:`${live.length} steps available`}</span>
            <Link className={styles.pathAction} href={"/career/paths/"+path.slug}>{lang==="zh"?"查看完整训练":"See training"} <span aria-hidden="true">→</span></Link>
          </div>
          {first?.href&&<Link className={styles.pathPreview} href={first.href}>{lang==="zh"?"先免费动手练习":"Try a free exercise"} →</Link>}
        </article>;
      })}
    </div>
    <p className={styles.pathDisclaimer}>{lang==="zh"?"已开放训练可直接进入；尚未开售的职业付费项目不会显示虚构价格或付款按钮。":"Live activities open directly; unpublished paid services never show fictitious prices or checkout buttons."}</p>
  </section>
  <section className={styles.quickSection} aria-labelledby="quick-services-heading">
   <div className={styles.sectionTop}><h2 id="quick-services-heading">{t.quick}</h2><Link href="/account">{t.records} →</Link></div>
   <div className={styles.quickGrid}>{SERVICES.map((item,i)=>
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
  <p className={styles.pageNote}>{t.guide}</p>
 </div>;
}
