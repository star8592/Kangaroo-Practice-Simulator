"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import styles from "@/app/workspace/workspace.module.css";

type TeacherClass={id:string;tenant_id:string;name:string};
function validClass(value:unknown):value is TeacherClass{
 if(!value||typeof value!=="object")return false;
 const c=value as Record<string,unknown>;
 return typeof c.id==="string"&&typeof c.tenant_id==="string"&&typeof c.name==="string";
}

/** Real teacher-owned classes only. No cross-tenant counts or mock rosters. */
export default function TeacherClassOverview(){
 const [classes,setClasses]=useState<TeacherClass[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const r=await fetch("/english/pronunciation/classroom-api/teacher/classes",
       {credentials:"same-origin",cache:"no-store"});
    const payload=await r.json();
    if(!r.ok)throw Error(payload.error||"无法查询班级");
    if(active)setClasses(Array.isArray(payload.classes)?payload.classes.filter(validClass).slice(0,100):[]);
   }catch(reason){if(active)setError(reason instanceof Error?reason.message:"暂时无法查询班级");}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[]);
 return <section className={styles.classSection} aria-labelledby="teacher-own-classes">
  <div className={styles.headingRow}>
   <div><span className={styles.kicker}>CLASSROOMS</span><h2 id="teacher-own-classes">我的英语班级</h2>
    <p>从实际已授权的班级出发，管理学生、发邀请、布置跟读练习。</p></div>
   <Link href="/english/pronunciation/classrooms">进入班级工作台</Link>
  </div>
  {loading?<p role="status">正在读取已授权的班级…</p>:null}
  {error?<p role="alert" className={styles.error}>暂时无法读取班级：{error}。你仍可从原班级工作台进入。</p>:null}
  {!loading&&!error&&classes.length===0?<div className={styles.emptyClasses}>
    <strong>还没有班级</strong>
    <p>使用原教师授权直接创建班级，无需重新注册或再次申请教师资格。</p>
    <Link href="/english/pronunciation/classrooms">创建我的英语班级 →</Link>
   </div>:null}
  {!error&&classes.length>0?<div className={styles.classGrid}>
    {classes.map(item=><article key={item.tenant_id+":"+item.id} className={styles.classCard}>
      <span className={styles.classBadge}>英语跟读</span>
      <h3>{item.name}</h3>
      <p>在统一教师工作台查看作业、学生与跟读成绩。</p>
      <Link href="/english/pronunciation/classrooms">打开班级 · 发邀请 →</Link>
    </article>)}
   </div>:null}
 </section>;
}
