import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {ENGLISH_SPEAKING_ROOT,SPEAKING_REGIONS,regionByYear,regionPath,regionExamHref,WUHAN_SESSIONS} from "@/lib/english-speaking-regions";
import styles from "../../english-speaking.module.css";

type Props={params:Promise<{city:string;year:string}>};
export const dynamicParams=false;
export function generateStaticParams(){return SPEAKING_REGIONS.map(({city,year})=>({city,year}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {city,year}=await params;const r=regionByYear(city,year);if(!r)return {};
 return {title:r.cityName+year+"中考英语听说机考模拟与专项训练｜SOC THINK",description:r.summary+" "+r.caution,alternates:{canonical:regionPath(r)},...(r.paperId==="shanghai-2027"?{robots:{index:false,follow:true}}:{})};
}
export default async function RegionalExamPage({params}:Props){
 const {city,year}=await params;const r=regionByYear(city,year);if(!r)notFound();
 const alternatives=SPEAKING_REGIONS.filter(x=>x.city===city&&x.year!==year);
 return <div className={styles.page} data-testid="english-speaking-city-page" data-paper={r.paperId}>
  <nav className={styles.crumbs} aria-label="当前位置"><Link href="/">首页</Link><span>/</span><Link href={ENGLISH_SPEAKING_ROOT}>英语听说考试中心</Link><span>/</span><span aria-current="page">{r.cityName} {year}</span></nav>
  <header className={styles.hero}>
   <p className={styles.eyebrow}>SOC THINK · {r.cityName}专版 · {year}</p>
   <h1>{r.cityName}{year}中考英语听说备考</h1><p>{r.summary}</p>
   <div className={styles.heroLinks}><Link href={regionExamHref(r,r.papers[0],"simulation")}>开始模拟考试</Link><a href="#skills">专项训练</a></div>
  </header>
  <section className={styles.journey} aria-label="地区考试规则">
   <h2>考试规则与备考范围</h2><p>{r.status}</p>
   <div className={styles.steps}>{r.facts.map(([label,value])=><span key={label}>{value}<br/>{label}</span>)}</div>
   <p>{r.caution}</p>
   {alternatives.length>0&&<p>其他年份：{alternatives.map(x=><Link key={x.year} href={regionPath(x)}>{x.year}版（{x.status}）</Link>)}</p>}
  </section>
  <section className={styles.list} id="papers" aria-labelledby="regional-papers">
   <h2 id="regional-papers">{city==="wuhan"?"武汉四题型统一适应性模拟":"本地区原创模拟卷"}</h2><div className={styles.cards}>{r.papers.map(p=><article key={p.label} className={styles.card}><h3>{p.label}</h3><p>{p.note}</p><Link href={regionExamHref(r,p,"simulation")}>限时模拟 →</Link><Link href={regionExamHref(r,p,"practice")}>自由练习 →</Link></article>)}</div>
  </section>
  <section className={styles.list} id="skills" aria-labelledby="regional-skills">
   <h2 id="regional-skills">专项训练</h2>
   <div className={styles.wuhanDrills}>{r.skills.map(([name,detail])=>{const drills=r.drills?.filter(d=>(d.skill??d.name)===name)??[];return <article className={styles.card} key={name}><h3>{name}</h3><p>{detail}</p>{drills.length?drills.map(drill=><Link key={drill.id} href={regionExamHref(r,r.papers[0],"practice",drill.id)}>{drill.name}练习 →</Link>):<Link href={regionExamHref(r,r.papers[0],"practice")}>进入本地区练习卷 →</Link>}</article>})}</div>
   <p className={styles.note}>专项入口对应本地区原创套卷中的具体题目；不是独立大题库，后续持续扩充。</p>
  </section>
  {city==="wuhan"&&<section className={styles.journey} data-testid="wuhan-learning-feedback"><h2>考后诊断与针对性复练</h2><p>不是只告诉你做对几题：四题型独立反馈、回听录音、定位问题，再进入对应专项。</p><div className={styles.wuhanDrills}><article className={styles.card}><h3>听后选择</h3><p>核对原文证据、正确选项和练习方向。</p></article><article className={styles.card}><h3>听后应答</h3><p>按题目要点回听核查，支持正确同义表达；自动语义评分仍待完善。</p></article><article className={styles.card}><h3>模仿朗读</h3><p>模型参考分、真实返回的错词与原声对照。</p></article><article className={styles.card}><h3>听后转述</h3><p>逐项核对关键信息，定位遗漏并复练。</p></article></div></section>}
  {city==="wuhan"&&<section className={styles.journey} aria-label="考试场次"><h2>每日12场正式考试安排</h2><p>4月17—18日每日4个时段，每场含考务（长江日报报道）；下方具体起止时刻来自所获实施方案扫描件，考生场次以学校安排为准。</p><div className={styles.steps}>{WUHAN_SESSIONS.map((sessions,index)=><div key={index} className={styles.sessionGroup}><strong>时段 {index+1}</strong>{sessions.map((session,i)=><div key={session}>第{index*3+i+1}场 · {session}</div>)}</div>)}</div></section>}
  <section className={styles.retrain}><div><h2>教师布置训练与考后复练</h2><p>使用现有教师工作台及发音练习；整班排考、跨设备归档及开放题语义自动评分仍待完善。</p></div><Link href="/workspace">教师工作台 →</Link></section>
  <p><Link href="/english/pronunciation/app/practice-library">进入 AccentLab 发音与纠音</Link></p>
  <section className={styles.journey}><h2>规则资料与说明</h2><ul>{r.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}</ul><p>独立原创备考服务，非官方真题、官方客户端或官方等值评分。旧政策与新考纲分开管理。</p></section>
 </div>;
}
