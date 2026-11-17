"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
type Class={tenant_id:string;class_id:string;class_name:string;teacher_name:string};
export default function MyClassesClient(){
 const [items,setItems]=useState<Class[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const router=useRouter();
 useEffect(()=>{let mounted=true;
  void (async()=>{try{
   const r=await fetch("/english/pronunciation/classroom-api/student/classes",
    {credentials:"same-origin",cache:"no-store"});
   if(r.status===401){router.replace("/login?next=%2Fenglish%2Fpronunciation%2Fmy-classes");return;}
   const v=await r.json();if(!r.ok)throw new Error(v.error||"无法读取我的班级");
   if(mounted)setItems(Array.isArray(v.classes)?v.classes:[]);
  }catch(e){if(mounted)setError(e instanceof Error?e.message:"暂时无法加载班级");}
  finally{if(mounted)setLoading(false);}
  })();return()=>{mounted=false;};
 },[router]);
 return <div style={{display:"grid",gap:14,marginTop:18}}>
  {loading?<p role="status">正在核对我的班级…</p>:null}
  {error?<p role="alert">{error}</p>:null}
  {!loading&&!error&&items.length===0?<p>尚未加入老师的班级。请使用老师分享的班级二维码申请。</p>:null}
  {items.map(c=><article key={c.tenant_id+":"+c.class_id}
    style={{border:"1px solid #d1d5db",borderRadius:12,padding:16}}>
    <h2 style={{margin:0}}>{c.class_name}</h2>
    <p>任课老师：{c.teacher_name}</p>
    <p>已加入 · 英语跟读。老师布置作业后，可以通过作业链接完成练习。</p>
   </article>)}
  <Link href="/english/pronunciation">返回英语发音练习</Link>
 </div>;
}
