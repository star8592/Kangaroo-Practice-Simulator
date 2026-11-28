"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
export default function RedeemForm(){
 const [code,setCode]=useState("");
 const [pending,setPending]=useState(false);
 const [message,setMessage]=useState("");
 const [done,setDone]=useState(false);
 async function redeem(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(pending||done)return;
  setPending(true);setMessage("");
  try{
   const response=await fetch("/api/platform/billing/redeem",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
   const data=await response.json();
   if(response.ok&&data.code==="ACTIVATED"){setDone(true);setCode("");setMessage("激活测试成功，权益已绑定当前账号。");}
   else setMessage(data.code==="INVALID_CODE"?"请检查激活码格式。":data.code==="VOUCHER_UNAVAILABLE"?"此卡券无效、已过期或不可领取。":"暂时无法激活，请稍后再试。");
  }catch{setMessage("网络异常，请稍后再试。");}
  finally{setPending(false);}
 }
 return <form onSubmit={redeem} style={{display:"grid",gap:16}}>
  <label htmlFor="voucher-code">激活码</label>
  <input id="voucher-code" value={code} onChange={e=>setCode(e.target.value)} required maxLength={64} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={pending||done} style={{minHeight:48,padding:12,fontSize:16}}/>
  <button disabled={pending||done||!code.trim()} style={{minHeight:48,padding:12}}>{pending?"正在激活…":done?"已激活":"确认激活"}</button>
  <p role="status" aria-live="polite">{message}</p>
  {done&&<Link href="/account">返回我的账号</Link>}
 </form>;
}
