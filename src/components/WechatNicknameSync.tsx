"use client";

import {useState,useSyncExternalStore} from "react";
import styles from "@/app/account/AccountPage.module.css";

const ACCOUNT_URL="https://socthink.cn/account";
const PROFILE_CONSENT="/api/auth/parent/wechat/start?profile=1&next=%2Faccount";

/** Profile consent is optional. The existing silent login must keep working. */
const noBrowserUpdates=()=>()=>{};
const browserIsWechat=()=>typeof navigator!=="undefined"&&/MicroMessenger/i.test(navigator.userAgent);
const serverIsWechat=()=>false;

export default function WechatNicknameSync(){
 const inWechat=useSyncExternalStore(noBrowserUpdates,browserIsWechat,serverIsWechat);
 const [hint,setHint]=useState("");
 async function copyAccountLink(){
  try {
   await navigator.clipboard.writeText(ACCOUNT_URL);
   setHint("已复制账号页面链接。请在微信聊天中打开后同步昵称。");
  } catch {
   setHint("请把 https://socthink.cn/account 发送到微信，在微信内打开。");
  }
 }
 return <div className={styles.nicknameActions}>
  {inWechat?
   <a className={styles.nicknameAction} href={PROFILE_CONSENT}>同步微信昵称</a>:
   <button className={styles.nicknameAction} type="button" onClick={()=>void copyAccountLink()}>
     复制微信内打开的链接
    </button>}
  {!inWechat?<small>请在手机微信内打开此账号页面，授权后昵称会自动补全。</small>:null}
  {hint?<small role="status">{hint}</small>:null}
 </div>;
}
