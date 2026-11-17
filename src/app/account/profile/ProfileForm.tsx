"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
export default function ProfileForm({currentName,nextPath}:{currentName:string;nextPath:string}){
 const [name,setName]=useState(currentName),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const router=useRouter();
 async function save(e:FormEvent){
  e.preventDefault();if(busy)return;setError("");setBusy(true);
  try{
   const r=await fetch("/api/auth/me",{method:"PATCH",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({profileAction:"set-wechat-display-name",name:name.trim()})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error||"保存失败");
   router.replace(nextPath.startsWith("/account/profile")?"/account":nextPath);
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"保存失败");}
  finally{setBusy(false);}
 }
 return <form onSubmit={e=>void save(e)} style={{display:"grid",gap:12,marginTop:22}}>
  <label htmlFor="verified-display-name"><strong>姓名或昵称（必填）</strong></label>
  <input id="verified-display-name" required minLength={2} maxLength={30} autoComplete="nickname"
   autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="例如：Candy老师、小明"
   style={{fontSize:18,padding:12,border:"1px solid #9ca3af",borderRadius:10}}/>
  <small>老师建议填写授课名称，学生使用老师能够辨认的姓名；允许以后修改。</small>
  <button type="submit" disabled={busy||[...name.trim()].length<2}
   style={{padding:13,fontWeight:700,borderRadius:10}}>{busy?"正在保存…":"保存名称并继续"}</button>
  {error?<p role="alert" style={{color:"#b91c1c"}}>{error}</p>:null}
 </form>;
}
