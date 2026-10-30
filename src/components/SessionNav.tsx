"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useCallback,useEffect,useRef,useState} from "react";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./SiteHeader.module.css";

type Account={name:string;wechatId?:string;wechatOpenId?:string};
type Admin={name:string;role?:string};
export default function SessionNav(){
 const router=useRouter(),pathname=usePathname(),lang=useSiteLanguage();
 const [loaded,setLoaded]=useState(false);
 const [account,setAccount]=useState<Account|null>(null);
 const [admin,setAdmin]=useState<Admin|null>(null);
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const read=useCallback(async()=>{
  const [buyer,legacy]=await Promise.allSettled([
   fetch("/api/auth/parent/me",{cache:"no-store"}).then(async r=>r.ok?(await r.json()).user:null),
   fetch("/api/auth/me",{cache:"no-store"}).then(async r=>r.ok?(await r.json()).user:null),
  ]);
  const b=buyer.status==="fulfilled"?buyer.value:null;
  const old=legacy.status==="fulfilled"?legacy.value:null;
  setAccount(b&&(b.wechatId||b.wechatOpenId)?b:null);
  setAdmin(old?.role==="admin"?old:null);
  setLoaded(true);
 },[]);
 useEffect(()=>{
  const task=setTimeout(()=>{void read();},0);
  return()=>clearTimeout(task);
 },[read,pathname]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const esc=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
  document.addEventListener("pointerdown",close);document.addEventListener("keydown",esc);
  return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",esc);};
 },[open]);
 async function logout(){
  await fetch(account?"/api/auth/parent/logout":"/api/auth/logout",{method:"POST"}).catch(()=>{});
  setOpen(false);setAccount(null);setAdmin(null);router.replace("/login");router.refresh();
 }
 if(!loaded)return <span className={styles.accountSkeleton} aria-label="正在读取账号"/>;
 if(!account&&!admin)return <div className={styles.guestActions}>
  <Link className={styles.guestParent} href="/login?next=%2Faccount">
   <span>{lang==="zh"?"微信登录":"WeChat sign in"}</span>
   <small>{lang==="zh"?"一个账号，直接使用":"One account"}</small>
  </Link>
 </div>;
 const label=account?.name||admin?.name||"我的账号";
 return <div className={styles.accountRoot} ref={root}>
  <button type="button" className={styles.accountTrigger} aria-haspopup="menu"
   aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
    <span className={styles.accountAvatar+" "+styles.avatar_parent}>{account?"微":"管"}</span>
    <span className={styles.accountIdentity}><strong>{label}</strong>
     <small>{account?(lang==="zh"?"微信已登录":"WeChat connected"):"Admin"}</small>
    </span>
  </button>
  {open&&<div className={styles.accountMenu} role="menu">
    <div className={styles.accountMenuLinks}>
      <Link href={account?"/account":"/admin"} onClick={()=>setOpen(false)} role="menuitem">
       {lang==="zh"?"我的账号":"My account"}
      </Link>
      <Link href="/assessments" onClick={()=>setOpen(false)} role="menuitem">
       {lang==="zh"?"选择考试或资料":"Exams & resources"}
      </Link>
      <Link href="/membership" onClick={()=>setOpen(false)} role="menuitem">
       {lang==="zh"?"我的权益与购买":"Purchases & access"}
      </Link>
    </div>
    <div className={styles.accountSwitch}>
     <button type="button" onClick={()=>void logout()}>{lang==="zh"?"退出登录":"Sign out"}</button>
    </div>
  </div>}
 </div>;
}
