"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import WechatWebsiteQr from "./WechatWebsiteQr";
import styles from "./AuthExperience.module.css";

type Mode="checking"|"loading"|"qr"|"error";
const inWechat=()=>typeof navigator!=="undefined"&&/MicroMessenger/i.test(navigator.userAgent);

export default function UnifiedLoginClient({nextPath}:{nextPath:string}) {
  const router=useRouter();
  const destination=nextPath.startsWith("/")&&!nextPath.startsWith("//")&&!nextPath.includes("\\")?nextPath:"/account";
  const [mode,setMode]=useState<Mode>("checking");
  const [qrUrl,setQrUrl]=useState("");
  const [message,setMessage]=useState("");
  const [mobileExternal,setMobileExternal]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const disposed=useRef(false);
  const ticket=useRef("");
  const stop=useCallback(()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;},[]);
  const start=useCallback(async()=>{
    stop();ticket.current="";setQrUrl("");setMessage("");setMode("loading");
    if(inWechat()){
      window.location.replace("/api/auth/parent/wechat/start?next="+encodeURIComponent(destination));
      return;
    }
    try{
      const ctrl=new AbortController();
      const timeout=setTimeout(()=>ctrl.abort(),10000);
      let res:Response;
      try {
        res=await fetch("/api/auth/parent/wechat/qr",{
          method:"POST",credentials:"same-origin",cache:"no-store",signal:ctrl.signal,
        });
      }finally{clearTimeout(timeout);}
      const body=await res.json();
      if(!res.ok||typeof body.ticket!=="string"||
         typeof body.qrAuthorizeUrl!=="string")
        throw new Error(body.error||"微信官方登录暂不可用");
      if(disposed.current)return;
      ticket.current=body.ticket;setQrUrl(body.qrAuthorizeUrl);setMode("qr");
      async function poll(){
        if(disposed.current||ticket.current!==body.ticket)return;
        try{
          const r=await fetch("/api/auth/parent/wechat/qr/status?ticket="+encodeURIComponent(body.ticket),{
            credentials:"same-origin",cache:"no-store",
          });
          const s=await r.json();
          if(disposed.current||ticket.current!==body.ticket)return;
          if(s.status==="authenticated"){stop();router.replace(destination);router.refresh();return;}
          if(s.status==="expired"){stop();setMode("error");setMessage("二维码已过期，请重新扫码。");return;}
        }catch{/* Temporary network loss must not falsely authenticate. */}
        if(!disposed.current)timer.current=setTimeout(()=>{void poll();},1800);
      }
      timer.current=setTimeout(()=>{void poll();},1800);
    }catch(e){
      if(disposed.current)return;
      setMode("error");
      setMessage(e instanceof Error&&e.name==="AbortError"?"微信登录连接超时，请重试。":
        e instanceof Error?e.message:"微信登录暂不可用");
    }
  },[destination,router,stop]);

  useEffect(()=>{
    disposed.current=false;
    const mobileTask=setTimeout(()=>{
      setMobileExternal(/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)&&!inWechat());
    },0);
    let canceled=false;
    void (async()=>{
      try{
        const ctrl=new AbortController();
        const timeout=setTimeout(()=>ctrl.abort(),6000);
        let res:Response;
        try{res=await fetch("/api/auth/parent/me",{
          cache:"no-store",credentials:"same-origin",signal:ctrl.signal,
        });}finally{clearTimeout(timeout);}
        if(canceled)return;
        if(res.ok){
          const body=await res.json();
          if(body.user?.wechatId||body.user?.wechatOpenId){
            router.replace(destination);router.refresh();return;
          }
        }
      }catch{/* Login is available even if the status endpoint fails. */}
      if(!canceled)void start();
    })();
    return()=>{canceled=true;disposed.current=true;ticket.current="";clearTimeout(mobileTask);stop();};
  },[destination,router,start,stop]);

  async function shareToWechat(){
    const url=window.location.href;
    if(typeof navigator.share==="function"){
      try{await navigator.share({title:"SOC THINK 微信登录",url});return;}catch{/* Copy fallback. */}
    }
    try{await navigator.clipboard.writeText(url);setMessage("链接已复制，请发送到微信中打开。");}
    catch{setMessage("请把当前网页地址复制到微信中打开。");}
  }

  return <main className={styles.unifiedShell}>
    <section className={styles.unifiedIntro}>
      <span className={styles.formKicker}>SOC THINK · 考试与资料服务</span>
      <h1>一个微信账号，直接使用</h1>
      <p>微信登录后，选择考试或资料。购买、使用和已购记录都在同一个账号里。</p>
      <div className={styles.unifiedSteps}>
        <span>微信登录</span><span>选择考试或资料</span><span>付款后直接使用</span>
      </div>
      <Link className="secondary-button" href="/assessments">先浏览考试与资料</Link>
    </section>
    <section className={styles.unifiedLoginBox} aria-label="微信登录">
      <h2>微信登录</h2>
      <p>首次扫码自动创建账号，以后继续用同一个微信登录。</p>
      {(mode==="checking"||mode==="loading")&&
        <div role="status" className={styles.unifiedLoading}>正在连接微信…</div>}
      {mode==="qr"&&qrUrl&&<div className={styles.unifiedQr}>
        <WechatWebsiteQr authorizeUrl={qrUrl}/>
        <p>请用微信扫一扫；登录成功后自动进入。</p>
      </div>}
      {mobileExternal&&<div className={styles.unifiedMobileHint}>
        <p>手机浏览器中无法扫描自己的屏幕，请把本页分享到微信里打开。</p>
        <button className="secondary-button" type="button" onClick={()=>void shareToWechat()}>发送到微信打开</button>
      </div>}
      {message&&<p role="alert" className={styles.error}>{message}</p>}
      {(mode==="qr"||mode==="error")&&
        <button type="button" className="primary-button" onClick={()=>void start()}>
          {mode==="qr"?"刷新登录二维码":"重新连接微信"}
        </button>}
    </section>
  </main>;
}
