"use client";
import {useState} from "react";
import {PLATFORM_CAPABILITIES} from "@/lib/platform-capabilities";
import styles from "@/app/admin/platform-authorizations/admin.module.css";

type User={subject:string;name:string;email:string|null;lastLoginAt:number|null};
type Grant={subject:string;capability:string;role:"teacher"|"module-admin";
 scopeKind:"product"|"organization";scopeId:string;grantedAt:string};

export default function PlatformGrantsAdminClient(){
 const [query,setQuery]=useState("");
 const [users,setUsers]=useState<User[]>([]);
 const [selected,setSelected]=useState<User|null>(null);
 const [grants,setGrants]=useState<Grant[]>([]);
 const [capability,setCapability]=useState<string>("english.pronunciation");
 const [role,setRole]=useState<"teacher"|"module-admin">("teacher");
 const scopeKind="product" as const;
 const scopeId="";
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 async function request<T>(url:string,method="GET",body?:object):Promise<T>{
  const res=await fetch(url,{method,cache:"no-store",credentials:"same-origin",
   headers:body?{"Content-Type":"application/json"}:undefined,
   body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error("请求未成功（"+res.status+"）："+
    ("error" in data?String(data.error):"请稍后重试"));
  return data as T;
 }
 async function search(){
  setBusy(true);setError("");setNotice("");setSelected(null);setGrants([]);
  try{
   if(!query.trim()){setError("请输入教师姓名、微信账号关联邮箱或平台用户编号。");return}
   const r=await request<{users:User[]}>("/api/platform/admin/accounts?q="+encodeURIComponent(query.trim()));
   setUsers(r.users);
  }catch(e){setError(e instanceof Error?e.message:"查询失败")}
  finally{setBusy(false)}
 }
 async function choose(u:User){
  setSelected(u);setError("");setNotice("");setBusy(true);
  try{
   const r=await request<{grants:Grant[]}>("/api/platform/admin/grants?subject="+encodeURIComponent(u.subject));
   setGrants(r.grants);
  }catch(e){setError(e instanceof Error?e.message:"授权读取失败")}
  finally{setBusy(false)}
 }
 async function change(action:"grant"|"revoke",target?:Grant){
  if(!selected||busy)return;
  setBusy(true);setError("");setNotice("");
  const input={
   subject:selected.subject,action,
   capability:target?.capability||capability,role:target?.role||role,
   scopeKind:target?.scopeKind||scopeKind,
   scopeId:target?.scopeId??(scopeKind==="product"?"":scopeId),
  };
  try{
   const result=await request<{changed:boolean}>("/api/platform/admin/grants","POST",input);
   const latest=await request<{grants:Grant[]}>("/api/platform/admin/grants?subject="+
     encodeURIComponent(selected.subject));
   setGrants(latest.grants);
   setNotice(result.changed?(action==="grant"?"平台模块授权已保存。原产品任课和班级权限仍须单独核验。":"模块授权已撤销。"):
      "授权状态无变化（幂等操作）。");
  }catch(e){setError(e instanceof Error?e.message:"操作失败")}
  finally{setBusy(false)}
 }
 const ready=PLATFORM_CAPABILITIES.filter(x=>x.implemented);
 return <div className={styles.wrap}>
  <section className={styles.panel}>
   <h2>查找已登录微信的用户</h2>
   <p>只查询平台注册过微信的账号。不存在的账号不能通过管理员授权接口自动创建。</p>
   <form className={styles.search} onSubmit={e=>{e.preventDefault();void search()}}>
    <label htmlFor="platform-user-search">姓名、邮箱或平台用户编号</label>
    <div><input id="platform-user-search" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/>
     <button disabled={busy} type="submit">查找用户</button></div>
   </form>
   {users.length>0&&<ul className={styles.users}>
    {users.map(u=><li key={u.subject}>
     <button type="button" disabled={busy} onClick={()=>void choose(u)}
      aria-pressed={selected?.subject===u.subject}>
      <strong>{u.name||"微信用户"}</strong>
      <small>{u.email||"未设置邮箱"} · {u.subject}</small></button>
    </li>)}
   </ul>}
  </section>
  {selected&&<section className={styles.panel}>
   <h2>为 {selected.name} 配置模块</h2>
   <p>平台授权只决定管理入口与模块范围；真正的机构任课、班级和学生数据仍由教学服务校验。</p>
   <div className={styles.form}>
    <label>管理模块
     <select value={capability} onChange={e=>setCapability(e.target.value)}>
      {ready.map(c=><option key={c.id} value={c.id}>{c.name}（{c.product}）</option>)}
     </select></label>
    <label>管理角色
     <select value={role} onChange={e=>setRole(e.target.value as typeof role)}>
      <option value="teacher">任课教师</option><option value="module-admin">项目管理员</option>
     </select></label>
    <p>授权范围：模块管理入口（具体任课机构和班级继续由原产品权限系统核验）。</p>
    <button disabled={busy} type="button" onClick={()=>void change("grant")}>授予模块</button>
   </div>
   <h3>当前有效授权</h3>
   {grants.length===0?<p>该用户尚无平台模块管理授权。</p>:<ul className={styles.grants}>
    {grants.map(g=><li key={[g.capability,g.role,g.scopeKind,g.scopeId].join(":")}>
     <div><strong>{PLATFORM_CAPABILITIES.find(c=>c.id===g.capability)?.name||g.capability}</strong>
      <small>{g.role==="teacher"?"任课教师":"项目管理员"} · {g.scopeKind==="product"?"模块入口":"机构 "+g.scopeId}</small></div>
     <button type="button" disabled={busy} onClick={()=>void change("revoke",g)}>撤销</button>
    </li>)}
   </ul>}
  </section>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {notice&&<p role="status" className={styles.notice}>{notice}</p>}
 </div>;
}
