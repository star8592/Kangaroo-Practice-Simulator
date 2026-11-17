"use client";
import {useEffect,useState} from "react";
import {PLATFORM_CAPABILITIES} from "@/lib/platform-capabilities";
import styles from "@/app/admin/platform-authorizations/admin.module.css";

type User={subject:string;name:string;email:string|null;lastLoginAt:number|null};
const needsNickname=(name:string)=>!name.trim()||name==="微信用户"||name==="微信家长";
type Grant={subject:string;capability:string;role:"teacher"|"module-admin";
 scopeKind:"product"|"organization";scopeId:string;grantedAt:string};

async function request<T>(url:string,method="GET",body?:object):Promise<T>{
 const res=await fetch(url,{method,cache:"no-store",credentials:"same-origin",
  headers:body?{"Content-Type":"application/json"}:undefined,
  body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error("请求未成功（"+res.status+"）："+
   ("error" in data?String(data.error):"请稍后重试"));
 return data as T;
}

export default function PlatformGrantsAdminClient({initialSubject=""}:{initialSubject?:string}){
 const [query,setQuery]=useState(initialSubject);
 const [users,setUsers]=useState<User[]>([]);
 const [selected,setSelected]=useState<User|null>(null);
 const [grants,setGrants]=useState<Grant[]>([]);
 const [capability,setCapability]=useState<string>("english.pronunciation");
 const [role,setRole]=useState<"teacher"|"module-admin">("teacher");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [loaded,setLoaded]=useState(false);

 // The ordinary owner view shows the latest 40 real WeChat accounts.
 // A direct link from /admin/users opens the selected teacher immediately.
 useEffect(()=>{
  let alive=true;
  async function initialize(){
   setBusy(true);setError("");
   try{
    const r=await request<{users:User[]}>("/api/platform/admin/accounts?q="+encodeURIComponent(initialSubject));
    if(!alive)return;
    setUsers(r.users);
    if(initialSubject){
     const u=r.users.find(x=>x.subject===initialSubject);
     if(!u){setError("该账号不存在，或者尚未完成微信登录。");return}
     setSelected(u);
     const existing=await request<{grants:Grant[]}>("/api/platform/admin/grants?subject="+encodeURIComponent(u.subject));
     if(alive)setGrants(existing.grants);
    }
   }catch(e){if(alive)setError(e instanceof Error?e.message:"账号读取失败")}
   finally{if(alive){setBusy(false);setLoaded(true)}}
  }
  void initialize();
  return ()=>{alive=false};
 },[initialSubject]);

 async function search(){
  if(busy)return;
  setBusy(true);setError("");setNotice("");setSelected(null);setGrants([]);
  try{
   const r=await request<{users:User[]}>("/api/platform/admin/accounts?q="+encodeURIComponent(query.trim().slice(0,80)));
   setUsers(r.users);
   setLoaded(true);
  }catch(e){setError(e instanceof Error?e.message:"查询失败")}
  finally{setBusy(false)}
 }
 async function choose(u:User){
  if(busy)return;
  setSelected(u);setError("");setNotice("");setBusy(true);setGrants([]);
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
   scopeKind:target?.scopeKind||"product",scopeId:target?.scopeId??"",
  };
  try{
   const result=await request<{changed:boolean}>("/api/platform/admin/grants","POST",input);
   const latest=await request<{grants:Grant[]}>("/api/platform/admin/grants?subject="+
     encodeURIComponent(selected.subject));
   setGrants(latest.grants);
   setNotice(result.changed?(action==="grant"?
    "模块身份已保存。教师进入工作台后，具体班级仍需由教学系统单独授权。":
    "该模块的身份授权已撤销。"):"授权状态无变化。");
  }catch(e){setError(e instanceof Error?e.message:"操作失败")}
  finally{setBusy(false)}
 }
 const ready=PLATFORM_CAPABILITIES.filter(x=>x.implemented);
 return <div className={styles.wrap}>
  <section className={styles.panel}>
   <h2>微信用户列表与搜索</h2>
   <p>默认显示最近登录的 40 位微信用户，也可通过姓名、关联邮箱或平台编号搜索。这里只显示真实已创建的账号。</p>
   <form className={styles.search} onSubmit={e=>{e.preventDefault();void search()}}>
    <label htmlFor="platform-user-search">姓名、邮箱或平台账号编号</label>
    <div><input id="platform-user-search" value={query} maxLength={80}
      onChange={e=>setQuery(e.target.value)} placeholder="输入姓名；留空查看最近微信用户"/>
     <button disabled={busy} type="submit">{busy?"正在读取…":"查询"}</button></div>
   </form>
   {loaded && !busy && users.length===0 && <p>没有匹配的微信用户；请确认对方已经在 SOC THINK 主站完成登录。</p>}
   {users.length>0&&<ul className={styles.users} aria-label="可授权微信用户">
    {users.map(u=><li key={u.subject}>
     <button type="button" disabled={busy} onClick={()=>void choose(u)}
      aria-pressed={selected?.subject===u.subject}>
      <strong>{u.name||"微信用户"}</strong>
      {needsNickname(u.name)&&<small className={styles.missingNickname}>微信昵称待本人同步 · 请核对账号编号</small>}
      <small>{u.email||"未绑定邮箱"} · {u.subject}</small>
      <small>{u.lastLoginAt? "最近登录："+new Date(u.lastLoginAt).toLocaleString("zh-CN",{hour12:false}) : "暂无登录时间记录"}</small></button>
    </li>)}
   </ul>}
   <p><a href="/admin/users">查看全部用户、注册时间和分页列表</a></p>
  </section>
  {selected&&<section className={styles.panel}>
   <h2>为 {selected.name} 设置管理身份</h2>
   <p>账号编号：{selected.subject}。同名微信昵称可能重复，请核对编号后再授权。</p>
   {needsNickname(selected.name)&&<p className={styles.nicknameWarning}>此账号尚未同步微信昵称，无法凭“微信用户”辨认本人。授予教师身份前，请让对方在微信内打开 <a href="https://socthink.cn/account">我的账号</a> 点击“同步微信昵称”，或者通过最近登录时间与完整账号编号核对。</p>}
   <div className={styles.form}>
    <label>所属模块
     <select value={capability} onChange={e=>setCapability(e.target.value)}>
      {ready.map(c=><option key={c.id} value={c.id}>{c.name}（{c.product}）</option>)}
     </select></label>
    <label>身份
     <select value={role} onChange={e=>setRole(e.target.value as typeof role)}>
      <option value="teacher">教师</option><option value="module-admin">项目管理员</option>
     </select></label>
    <p>教师仅获得所选模块的教师工作台入口，不会自动取得其他产品、机构或班级的数据权限。</p>
    <button disabled={busy} type="button" onClick={()=>void change("grant")}>
     {busy?"正在保存…":"确认授权"}
    </button>
   </div>
   <h3>该用户当前有效身份</h3>
   {grants.length===0?<p>尚无平台模块授权。</p>:<ul className={styles.grants}>
    {grants.map(g=><li key={[g.capability,g.role,g.scopeKind,g.scopeId].join(":")}>
     <div><strong>{PLATFORM_CAPABILITIES.find(c=>c.id===g.capability)?.name||g.capability}</strong>
      <small>{g.role==="teacher"?"教师":"项目管理员"} · {g.scopeKind==="product"?"模块级":"机构 "+g.scopeId}</small></div>
     <button type="button" disabled={busy} onClick={()=>void change("revoke",g)}>撤销</button>
    </li>)}
   </ul>}
  </section>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {notice&&<p role="status" className={styles.notice}>{notice}</p>}
 </div>;
}
