import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {INTERVIEW_PROFILES,getInterviewProfile} from "@/lib/career-interview-scenarios";
import CareerInterviewClient from "@/components/CareerInterviewClient";
import styles from "@/components/career-interview.module.css";
export function generateStaticParams(){return INTERVIEW_PROFILES.map(p=>({id:p.id}));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;
 const profile=getInterviewProfile(id);
 return profile?{title:profile.title+"｜SOC THINK",description:profile.description,
  alternates:{canonical:"/career/interviews/"+profile.id}}:{title:"面试路线不存在"};
}
export default async function CareerInterviewPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const profile=getInterviewProfile(id);
 if(!profile)notFound();
 return <div className={styles.listShell}>
  <nav className={styles.breadcrumb}><Link href="/career">职业中心</Link><span>/</span><Link href="/career/interviews">模拟面试</Link><span>/</span>{profile.role}</nav>
  <CareerInterviewClient profileId={profile.id}/>
  <details className={styles.sourceDetails}>
   <summary>选题依据与适用边界</summary>
   <p>题目由SOCTHINK根据岗位职责独立设计。以下为公开招聘研究入口，不代表对应企业采用本页题本或评分标准。</p>
   <ul>{profile.sourceUrls.map(url=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}</a></li>)}</ul>
   <p>结构化提问方法参考 <a href="https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews" target="_blank" rel="noopener noreferrer">美国OPM结构化面试指南</a>；本原型尚未经过专家信效度验证，不提供企业人才测评结论。</p>
  </details>
 </div>;
}
