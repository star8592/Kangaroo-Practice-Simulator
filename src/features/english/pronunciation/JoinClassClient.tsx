"use client";
import {FormEvent,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
type Info={class_name:string;teacher_name:string;status:"new"|"pending"|"approved"|"rejected";joined:boolean};
const API="/english/pronunciation/classroom-api";
export default function JoinClassClient({tenant,classId,token}:{tenant:string;classId:string;token:string}){
 const router=useRouter();
 const [data,setData]=useState<Info|null>(null),[name,setName]=useState("");
 const [grade,setGrade]=useState("G6"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const endpoint=API+"/class-join/"+tenant+"/"+classId+"/"+token;
 useEffect(()=>{let active=true;
  void (async()=>{
   try{
    const user=await fetch("/api/auth/parent/me",{cache:"no-store",credentials:"same-origin"});
    if(!user.ok){if(active)router.replace("/login?next="+encodeURIComponent(window.location.pathname));return;}
    const me=await user.json();
    if(!me.user?.name||["微信用户","微信家长"].includes(me.user.name)){
     if(active)router.replace("/account/profile?next="+encodeURIComponent(window.location.pathname));return;
    }
    if(active)setName(me.user.name);
    const r=await fetch(endpoint,{cache:"no-store",credentials:"same-origin"});
    const v=await r.json();
    if(!r.ok)throw new Error(v.error||"班级链接不可用");
    if(active)setData(v);
   }catch(e){if(active)setError(e instanceof Error?e.message:"无法读取班级");}
  })();
  return()=>{active=false;};
 },[endpoint,router]);
 async function join(e:FormEvent){
  e.preventDefault();if(busy)return;
  setBusy(true);setError("");
  try{
   const r=await fetch(endpoint,{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({student_name:name.trim(),grade_label:grade})});
   const value=await r.json();if(!r.ok)throw new Error(value.error||"入班申请失败");
   setData(value);
  }catch(e){setError(e instanceof Error?e.message:"入班申请失败");}
  finally{setBusy(false);}
 }
 return <section style={{display:"grid",gap:15,marginTop:25,padding:20,
  border:"1px solid #d1d5db",borderRadius:16}}>
  {!data&&!error?<p role="status">正在核对微信身份和班级邀请码…</p>:null}
  {data?<><p>授课老师：<strong>{data.teacher_name}</strong></p>
   <h2>{data.class_name}</h2>
   {data.status==="approved"?<p role="status">你已加入本班。今后可通过老师分享的作业链接参加练习。 <Link href="/english/pronunciation/my-classes">查看我的班级</Link></p>:
    data.status==="pending"?<p role="status">申请已提交，请等待老师在教师工作台审核。无需反复扫码。</p>:
    <form onSubmit={e=>void join(e)} style={{display:"grid",gap:12}}>
     {data.status==="rejected"?<p>此前申请未通过，可向老师核实后重新申请。</p>:null}
     <label htmlFor="student-name">学生姓名（供老师核实）</label>
     <input id="student-name" required minLength={2} maxLength={30} value={name}
      onChange={e=>setName(e.target.value)} style={{padding:10,fontSize:17}}/>
     <label htmlFor="student-grade">年级</label>
     <select id="student-grade" value={grade} onChange={e=>setGrade(e.target.value)} style={{padding:10}}>
      {Array.from({length:12},(_,i)=><option key={i} value={"G"+(i+1)}>G{i+1}</option>)}
     </select>
     <button type="submit" disabled={busy||[...name.trim()].length<2}
      style={{padding:12,fontWeight:700}}>{busy?"正在申请…":"确认加入这个班级"}</button>
    </form>}
  </>:null}
  {error?<p role="alert" style={{color:"#b91c1c"}}>{error}</p>:null}
 </section>;
}
