import Link from "next/link";
import {notFound} from "next/navigation";
import {CAREER_PATHS,getCareerPath} from "@/lib/career-paths";
import {getCareerRole} from "@/lib/career-role-taxonomy";
import styles from "../career-paths.module.css";

type PageProps={params:Promise<{slug:string}>;searchParams:Promise<{audience?:string}>};
export function generateStaticParams(){return CAREER_PATHS.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:PageProps){
 const {slug}=await params;
 const path=getCareerPath(slug);
 if(!path)return {title:"岗位路线未找到｜SOC THINK"};
 return {title:path.title+" · 学习、实训与模拟｜SOC THINK",
  description:path.subtitle+"。显示实际开放内容及尚未建设的环节。",
  alternates:{canonical:"/career/paths/"+path.slug}};
}
export default async function CareerPathDetail({params,searchParams}:PageProps){
 const [{slug},query]=await Promise.all([params,searchParams]);
 const path=getCareerPath(slug);
 if(!path)notFound();
 const audience=query.audience==="social"?"social":"campus";
 const steps=path.steps.filter(s=>s.audience==="both"||s.audience===audience);
 const actions={learn:"阅读完整教程",lab:"开始动手练习","formal-exam":"进入正式模拟",interview:"开始模拟面试",resource:"打开资料"} as const;
 const available=steps.filter(s=>s.status==="live"&&s.href);
 const first=available.find(s=>s.stage==="learn"||s.stage==="lab")??available[0];
 const planned=steps.filter(s=>s.status==="planned").length;

 return <div className={styles.shell}>
  <nav className={styles.breadcrumb} aria-label="位置"><Link href="/career">岗位方向</Link><span>/</span><Link href="/career/paths">学习路线</Link><span>/</span><span>{path.title}</span></nav>
  <header className={styles.hero}>
   <div className={styles.offerHero}>
    <div className={styles.offerCopy}>
     <span className={styles.eyebrow}>SOC THINK / 职业训练</span>
     <h1>{path.title}</h1>
     <p>{path.subtitle}</p>
     <div className={styles.meta}><span>校招 / 社招分别准备</span><span>真实课程与练习</span><span>按实际交付收费</span></div>
    </div>
    <aside className={styles.offerSummary} aria-label="本路线可获得的服务">
     <span className={styles.offerEyebrow}>这条路线现在能做什么</span>
     <strong>{available.length} 项已开放</strong>
     <p>免费体验已有课程、练习或模拟；未开放的专属考试与收费服务不会显示付款入口。</p>
     {first?.href&&<Link className={styles.offerStart} href={first.href}>先免费开始训练 <span aria-hidden="true">→</span></Link>}
     <a className={styles.offerSecondary} href="#learning-stages">查看全部学习环节</a>
     <small>{planned>0?`${planned} 项专项内容尚未完成`:"所有列出的环节均已开放"} · 不承诺就业录用</small>
    </aside>
   </div>
  </header>
  <section className={styles.twocol} style={{marginTop:22}}>
   <div className={styles.panel}><h2>完成这条路线，你应当能够</h2><ul>{path.outcomes.map(x=><li key={x}>{x}</li>)}</ul></div>
   <div className={styles.panel}><h2>适合哪些岗位</h2><ul>{path.roleIds.map(id=>{
    const role=getCareerRole(id);
    return role?<li key={id}><Link href={"/career/roles/"+id}>{role.title}</Link></li>:null;
   })}</ul><p className={styles.note}>先修建议：{path.requirements}</p></div>
  </section>
  <h2 id="learning-stages" className={styles.title}>按你的求职阶段学习</h2>
  <div className={styles.switch} aria-label="求职阶段">
   <Link href={"/career/paths/"+path.slug+"?audience=campus"} aria-current={audience==="campus"?"page":undefined}>校招 / 应届</Link>
   <Link href={"/career/paths/"+path.slug+"?audience=social"} aria-current={audience==="social"?"page":undefined}>社招 / 转岗</Link>
  </div>
  <p className={styles.note}>已开放的项目直接进入，未完成的专项内容只作说明，不提供虚假付款入口。</p>
  <ol className={styles.steps}>
   {steps.map((step,i)=><li className={styles.step+(step.status==="planned"?" "+styles.pending:"")} key={step.id}>
    <span className={styles.stepNum}>{i+1}</span><div>
     <div className={styles.stepHead}><h3>{step.name}</h3><span className={styles.status}>{step.status==="live"?"已开放":"尚未上线"}</span></div>
     <p>{step.detail}</p>
     {step.href&&<Link href={step.href}>{actions[step.stage]} →</Link>}
     {step.note&&<p>{step.note}</p>}
    </div>
   </li>)}
  </ol>
  <details className={styles.sources}>
   <summary>查看原始资料与技术依据</summary>
   <p className={styles.note}>开源仓库和公开文档用于核对概念与源码，不构成本站原创教学或商业转售授权。下列原始链接可以直接访问上游。</p>
   <ul>{path.sourceLinks.map(source=><li key={source.url}>
     <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a> · {source.note}
   </li>)}</ul>
  </details>
  <p className={styles.warning}>{path.caveat}</p>
  <Link href="/career/paths">← 返回全部岗位路线</Link>
 </div>;
}
