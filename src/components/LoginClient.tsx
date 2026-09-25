"use client";
import Link from "next/link";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import {SITE_BRAND} from "@/lib/site-brand";

export default function LoginClient({nextPath}:{nextPath:string}){
 const router=useRouter(),[username,setUsername]=useState(""),[pin,setPin]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,pin})}),x=await r.json();if(!r.ok)throw new Error(x.error||"登录失败");const destination=x.user?.role==="student"&&x.user?.onboardingCompleted!==true?"/student/settings?welcome=1":nextPath;router.replace(destination);router.refresh()}catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false)}}
 return <div className="login-shell"><form className="login-card" onSubmit={submit}><div className="login-mark">{SITE_BRAND.mark}</div><span className="eyebrow">STUDENT LOGIN</span><h1>{SITE_BRAND.loginTitleZh}<br/><span>{SITE_BRAND.loginSubtitleZh}</span></h1><p>孩子使用学生账号或准考证号 + PIN 登录。训练记录会绑定到个人学习档案。</p><label>学生账号 / 准考证号<input autoFocus autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="输入账号或准考证号"/></label><label>学生 PIN<input type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="输入 PIN"/></label>{error&&<div className="login-error">{error}</div>}<button className="primary-button" disabled={!username.trim()||!pin||busy}>{busy?"正在验证…":"登录学生系统"}</button><div className="login-data-note"><b>账号安全</b><span>PIN 使用 scrypt 哈希保存；会话使用 HttpOnly 签名 Cookie。学生端不会提前收到正确答案。</span></div><div className="parent-login-entry"><b>家长入口</b><span>家长使用已验证邮箱管理孩子账号、找回密码和后续学习服务。</span><div><Link className="secondary-button" href="/parent/login">家长登录</Link><Link className="secondary-button" href="/parent/register">邮箱注册</Link></div></div></form></div>
}
