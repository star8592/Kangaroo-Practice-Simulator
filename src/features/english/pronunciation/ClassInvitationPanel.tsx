"use client";
import {useEffect,useState} from "react";
import QRCode from "qrcode";
type Invitation={enabled:boolean;url:string|null};
const API="/english/pronunciation/classroom-api";
export default function ClassInvitationPanel({tenant,classId}:{tenant:string;classId:string}){
 const [entry,setEntry]=useState<Invitation|null>(null),[qr,setQr]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const base=API+"/tenants/"+tenant+"/classes/"+classId+"/invitation";
 useEffect(()=>{let live=true;
  fetch(base,{credentials:"same-origin",cache:"no-store"}).then(async r=>{
   const v=await r.json();if(!r.ok)throw new Error(v.error||"邀请码读取失败");
   if(live)setEntry(v);
  }).catch(e=>{if(live)setError(e instanceof Error?e.message:"无法读取班级邀请");});
  return()=>{live=false;};
 },[base]);
 useEffect(()=>{let live=true;
  if(!entry?.url)return;
  QRCode.toDataURL(entry.url,{width:220,margin:2,errorCorrectionLevel:"M"})
   .then(v=>{if(live)setQr(v);}).catch(()=>{if(live)setQr("");});
  return()=>{live=false;};
 },[entry?.url]);
 async function change(action:"rotate"|"disable"){
  if(busy)return;
  if(action==="rotate"&&entry?.enabled&&
   !window.confirm("重新生成后，原来的邀请二维码会立即失效。确定继续？"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch(base+"/"+action,{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:"{}"});
   const v=await r.json();if(!r.ok)throw new Error(v.error||"更新失败");
   setEntry(v);setNotice(action==="rotate"?"邀请链接已生成，可发到微信群":"原班级邀请已停用");
  }catch(e){setError(e instanceof Error?e.message:"操作失败");}
  finally{setBusy(false);}
 }
 async function copy(){
  if(!entry?.url)return;
  try{await navigator.clipboard.writeText(entry.url);setNotice("已复制班级邀请链接");}
  catch{setError("复制失败，可选中链接手动复制");}
 }
 return <section aria-label="邀请学生加入班级" style={{border:"1px solid #d0d7df",borderRadius:14,padding:16,margin:"16px 0"}}>
  <h3>邀请学生加入本班</h3>
  <p style={{fontSize:14}}>与作业链接分开管理。学生用微信打开，确认班级后提交申请，由你审核通过。</p>
  {entry?.enabled&&entry.url?<>
   {qr?<img alt="本班微信邀请二维码" src={qr} width={220} height={220}/>:<p>正在生成二维码…</p>}
   <input aria-label="班级专属邀请链接" readOnly value={entry.url} onFocus={e=>e.target.select()}
    style={{width:"100%",padding:9,marginTop:8}}/>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
    <button type="button" onClick={()=>void copy()}>复制班级邀请链接</button>
    <button type="button" disabled={busy} onClick={()=>void change("rotate")}>更换二维码</button>
    <button type="button" disabled={busy} onClick={()=>void change("disable")}>停用邀请</button>
   </div>
  </>:<button type="button" disabled={busy} onClick={()=>void change("rotate")}>生成本班邀请二维码</button>}
  {error?<p role="alert">{error}</p>:null}
  {notice?<p role="status">{notice}</p>:null}
 </section>;
}
