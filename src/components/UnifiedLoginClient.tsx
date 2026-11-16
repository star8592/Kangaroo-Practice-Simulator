"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import WechatWebsiteQr from "./WechatWebsiteQr";
import styles from "./AuthExperience.module.css";

type Mode="checking"|"loading"|"qr"|"mobile"|"error";
const inWechat=()=>typeof navigator!=="undefined"&&/MicroMessenger/i.test(navigator.userAgent);
const mobileOutsideWechat=()=>typeof navigator!=="undefined"&&
  /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)&&!inWechat();
const loginErrorText:Record<string,string>={
  state_error:"微信授权状态已失效，请在当前微信页面重新登录。请勿复制旧的授权回调地址。",
  failed:"微信授权没有完成。请重试；如果微信仍显示错误，请检查公众号网页授权域名及接口权限。",
  unavailable:"当前公众号微信授权未配置，请联系网站管理员。",
};

export default function UnifiedLoginClient({nextPath,loginError}:{nextPath:string;loginError?:string}) {
  const router=useRouter();
  const destination=nextPath.startsWith("/")&&!nextPath.startsWith("//")&&!nextPath.includes("\\")?nextPath:"/account";
  // Same WeChat identity, contextual entry: no separate teacher/student passwords.
  const teacherLogin=destination.startsWith("/english/pronunciation/app/teacher/");
  const homeworkLogin=/^\/english\/pronunciation\/app\/a\//.test(destination);
  const vocabTeacherLogin=destination.startsWith("/english/vocabulary/app/teacher/");
  const vocabStudentLogin=/^\/english\/vocabulary\/app\/app\/(classroom|review|checkpoint)(?:\/|$)/.test(destination);
  const vocabularyEntry=vocabTeacherLogin||vocabStudentLogin;
  const platformWorkspaceLogin=destination==="/workspace";
  const platformOwnerLogin=destination.startsWith("/admin/platform-authorizations");
  const platformManagementEntry=platformWorkspaceLogin||platformOwnerLogin;
  const englishEntry=teacherLogin||homeworkLogin||vocabularyEntry;
  const [mode,setMode]=useState<Mode>("checking");
  const [qrUrl,setQrUrl]=useState("");
  const [message,setMessage]=useState(loginError?loginErrorText[loginError]||"微信登录未完成，请重新发起授权。":"");
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
    // A mobile browser cannot scan its own QR code. Never generate a desktop
    // ticket here; share the SAME destination into the WeChat in-app browser.
    if(mobileOutsideWechat()){
      setMode("mobile");
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
      if(canceled)return;
      // Explicit callback failures need a visible explanation, not an
      // automatic redirect loop back to the same failing WeChat provider.
      if(loginError){setMode("error");return;}
      void start();
    })();
    return()=>{canceled=true;disposed.current=true;ticket.current="";stop();};
  },[destination,router,start,stop,loginError]);

  async function shareToWechat(){
    const url=window.location.href;
    if(typeof navigator.share==="function"){
      try{await navigator.share({title:"SOC THINK 微信登录",url});return;}catch{/* Copy fallback. */}
    }
    try{await navigator.clipboard.writeText(url);setMessage("链接已复制，请发送到微信中打开。");}
    catch{setMessage("请把当前网页地址复制到微信中打开。");}
  }

  return <div className={styles.unifiedShell}>
    <section className={styles.unifiedIntro}>
      <span className={styles.formKicker}>{platformOwnerLogin?"SOC THINK · 平台授权管理":platformWorkspaceLogin?"SOC THINK · 我的管理工作台":vocabTeacherLogin?"词语星球 · 教师工作台":vocabStudentLogin?"词语星球 · 单词课堂":teacherLogin?"ENGLISH LEAP · 教师工作台":homeworkLogin?"ENGLISH LEAP · 跟读作业":"SOC THINK · 考试与资料服务"}</span>
      <h1>{platformOwnerLogin?"微信登录，管理项目授权":platformWorkspaceLogin?"微信登录，进入我的管理工作台":vocabTeacherLogin?"微信登录，进入单词教学工作台":vocabStudentLogin?"微信登录，回到我的单词课堂":teacherLogin?"微信登录，进入教师工作台":homeworkLogin?"微信登录，完成英语作业":"一个微信账号，直接使用"}</h1>
      <p>{platformOwnerLogin?"只有已验证的站点所有者可以授予或撤销模块管理权限。其他账号不会自动获得管理身份。":platformWorkspaceLogin?"使用 SOC THINK 统一微信账号。登录后只显示已经获授权的管理模块，实际任课和班级权限仍由教学系统核验。":vocabTeacherLogin?"第一次使用请先通过原教师账号确认身份并关联微信。以后可直接进入原教学工作台，班级、作业与成绩全部保留。":vocabStudentLogin?"第一次使用请先用原学生号进入单词课堂并关联微信。以后直接返回原课堂，学习记录和复习进度全部保留。":teacherLogin?"使用 SOC THINK 统一微信账号。管理员授予教师权限后，直接管理班级、布置作业、查看成绩。无需单独的教师密码。":homeworkLogin?"用家长或学生的微信账号登录，自动返回老师布置的作业，完成跟读并提交成绩。":"微信登录后，选择考试或资料。购买、使用和已购记录都在同一个账号里。"}</p>
      <div className={styles.unifiedSteps}>
        <span>微信登录</span><span>{platformOwnerLogin?"验证管理身份":platformWorkspaceLogin?"读取我的授权":vocabTeacherLogin?"返回原教师账号":vocabStudentLogin?"返回原学生账号":teacherLogin?"进入我的班级":homeworkLogin?"加入老师的班级":"选择考试或资料"}</span><span>{platformOwnerLogin?"授予 · 撤销模块":platformWorkspaceLogin?"管理获授权模块":vocabTeacherLogin?"管理班级 · 发布作业":vocabStudentLogin?"练单词 · 复习 · 进度":teacherLogin?"布置作业 · 查看成绩":homeworkLogin?"跟读 · 提交成绩":"付款后直接使用"}</span>
      </div>
      <Link className="secondary-button" href={platformManagementEntry?"/account":vocabularyEntry?"/english/vocabulary/app/":englishEntry?"/english/pronunciation/app/":"/assessments"}>{platformManagementEntry?"先查看我的账户":vocabularyEntry?"先浏览词语星球":englishEntry?"先浏览英语跟读":"先浏览考试与资料"}</Link>
    </section>
    <section className={styles.unifiedLoginBox} aria-label="微信登录">
      <h2>{platformOwnerLogin?"平台授权管理微信登录":platformWorkspaceLogin?"管理工作台微信登录":vocabTeacherLogin?"词语星球教师微信登录":vocabStudentLogin?"词语星球学生微信登录":teacherLogin?"教师微信登录":homeworkLogin?"作业微信登录":"微信登录"}</h2>
      <p>{platformManagementEntry||englishEntry?"登录状态有效时直接进入；需要验证时才扫码，不必每天重新登录。":"首次扫码自动创建账号，以后继续用同一个微信登录。"}</p>
      {(mode==="checking"||mode==="loading")&&
        <div role="status" className={styles.unifiedLoading}>正在连接微信…</div>}
      {mode==="qr"&&qrUrl&&<div className={styles.unifiedQr}>
        <WechatWebsiteQr authorizeUrl={qrUrl}/>
        <p>{platformManagementEntry?"用微信扫一扫；成功后自动返回"+(platformOwnerLogin?"授权管理页面。":"我的管理工作台。"):englishEntry?"用微信扫一扫；成功后自动返回"+(vocabTeacherLogin?"原教师工作台。":vocabStudentLogin?"原单词课堂。":teacherLogin?"教师工作台。":"当前作业。"):"请用微信扫一扫；登录成功后自动进入。"}</p>
      </div>}
      {mode==="mobile"&&<div className={styles.unifiedMobileHint} data-testid="wechat-mobile-one-device">
        <h3>一部手机即可完成微信登录</h3>
        <p>当前页面在手机普通浏览器中。请分享到微信聊天或“文件传输助手”，然后<strong>在微信里点开链接</strong>，无需另一台设备扫码。</p>
        <button className="primary-button" type="button" onClick={()=>void shareToWechat()}>
          分享／复制登录链接
        </button>
        <p>从微信群、公众号菜单直接打开教师工作台或学生作业链接时，会自动使用微信网页授权，不显示二维码。</p>
      </div>}
      {message&&<p role="alert" className={styles.error}>{message}</p>}
      {(mode==="qr"||mode==="error")&&
        <button type="button" className="primary-button" onClick={()=>void start()}>
          {mode==="qr"?"刷新登录二维码":"重新连接微信"}
        </button>}
    </section>
  </div>;
}
