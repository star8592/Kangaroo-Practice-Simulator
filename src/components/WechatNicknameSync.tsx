"use client";

import {useEffect,useState} from "react";
import styles from "@/app/account/AccountPage.module.css";

const ACCOUNT_URL="https://socthink.cn/account";
const PROFILE_CONSENT="/api/auth/parent/wechat/start?profile=1&next=%2Faccount";

/** Profile consent is optional. The existing silent login must keep working. */
export default function WechatNicknameSync(){
 const [inWechat,setInWechat]=useState<boolean|null>(null);
 const [hint,setHint]=useState("");
 useEffect(()=>{setInWechat(/MicroMessenger/i.test(navigator.userAgent));},[]);
 async function copyAccountLink(){
  try {
   await navigator.clipboard.writeText(ACCOUNT_URL);
   setHint("已复制账号页面链接。请在微信聊天中打开后同步昵称。");
  } catch {
   setHint("请把 https://socthink.cn/account 发送到微信，在微信内打开。");
  }
 }
 return <div className={styles.nicknameActions}>
  {inWechat===true?
   <a className={styles.nicknameAction} href={PROFILE_CONSENT}>同步微信昵称</a>:
   inWechat===false?
    <button className={styles.nicknameAction} type="button" onClick={()=>void copyAccountLink()}>
     复制微信内打开的链接
    </button>:
    <span className={styles.nicknameHint}>正在检查浏览器…</span>}
  {inWechat===false?<small>请在手机微信内打开此账号页面，授权后昵称会自动补全。</small>:null}
  {hint?<small role="status">{hint}</small>:null}
 </div>;
}
