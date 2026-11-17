"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import styles from "@/app/my/learning/learning-dashboard.module.css";

type JoinedClass={tenant_id:string;class_id:string;class_name:string;teacher_name:string};
function validClass(v:unknown):v is JoinedClass{
 if(!v||typeof v!=="object")return false;
 const c=v as Record<string,unknown>;
 return ["tenant_id","class_id","class_name","teacher_name"].every(k=>
   typeof c[k]==="string"&&String(c[k]).length>0);
}

/** The existing student-only /student/classes API is the sole source of truth.
 * No placeholder enrollments, grades, assignment due dates or mastery stats. */
export default function MyLearningClasses(){
 const [classes,setClasses]=useState<JoinedClass[]>([]);
 const [selected,setSelected]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const response=await fetch("/english/pronunciation/classroom-api/student/classes",
      {credentials:"same-origin",cache:"no-store"});
    const body=await response.json();
    if(!response.ok)throw Error(body.error||"暂时无法读取班级信息");
    if(!active)return;
    const entries=Array.isArray(body.classes)?body.classes.filter(validClass).slice(0,100):[];
    setClasses(entries);
    if(entries.length)setSelected(entries[0].tenant_id+":"+entries[0].class_id);
   }catch(reason){if(active)setError(reason instanceof Error?reason.message:"班级暂时不可用");}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[]);
 const current=classes.find(c=>c.tenant_id+":"+c.class_id===selected)||classes[0];
 return <section className={styles.classPanel} aria-labelledby="my-class-title">
  <div className={styles.sectionHeading}>
   <div><span className={styles.kicker}>MY CLASSROOM</span><h2 id="my-class-title">我的课堂</h2>
    <p>优先显示已通过老师审核的班级。每个班级只展示自己的学习入口。</p></div>
   <Link href="/english/pronunciation/my-classes">查看全部班级</Link>
  </div>
  {loading?<p role="status" className={styles.classState}>正在读取已加入的班级…</p>:null}
  {error?<p role="alert" className={styles.classError}>班级暂时无法加载：{error}。其他学科的自主学习仍可正常使用。</p>:null}
  {!loading&&!error&&!classes.length?<div className={styles.classEmpty}>
   <strong>暂未加入老师的班级</strong>
   <p>如果老师已经发出邀请，打开微信群中的班级链接或二维码，使用当前微信账号提交申请。审核后班级会自动出现在这里。</p>
   <Link href="/english/pronunciation/app/">先开始英语发音练习</Link>
  </div>:null}
  {current&&!error?<div className={styles.classActive}>
   {classes.length>1?<div className={styles.classSwitch}><label htmlFor="my-learning-select-class">切换已加入班级</label>
    <select id="my-learning-select-class" value={selected} onChange={e=>setSelected(e.target.value)}>
     {classes.map(c=><option key={c.tenant_id+":"+c.class_id} value={c.tenant_id+":"+c.class_id}>{c.class_name}</option>)}
    </select></div>:null}
   <div className={styles.classDetails}>
    <span className={styles.enrolled}>已加入</span>
    <h3>{current.class_name}</h3>
    <p>任课老师：{current.teacher_name}</p>
    <p className={styles.classNote}>老师布置的英语跟读作业可通过原作业链接进入；尚未接入统一任务清单的作业不会在这里虚构。</p>
    <div className={styles.classActions}>
     <Link className={styles.primaryAction} href="/english/pronunciation/my-classes">查看班级</Link>
     <Link href="/english/pronunciation/app/">英语跟读练习</Link>
    </div>
   </div>
  </div>:null}
 </section>;
}
