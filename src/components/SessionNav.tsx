"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useCallback,useEffect,useRef,useState} from "react";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./SiteHeader.module.css";

type Account={name:string;wechatId?:string;wechatOpenId?:string};
type Admin={name:string;role?:string};
type ParentStatus={user?:Account;siteAdmin?:boolean};
type WorkspaceModule={id:string;name:string;managementUrl:string};
type WorkspaceStatus={modules?:WorkspaceModule[];siteOwner?:boolean};

/**
 * Server-confirmed roles drive visible workspaces, never the authority itself.
 * No role is inferred from WeChat display names, route query strings or
 * localStorage. All destination pages independently authorize every action.
 */
export default function SessionNav(){
 const router=useRouter(),pathname=usePathname(),lang=useSiteLanguage();
 const [loaded,setLoaded]=useState(false);
 const [account,setAccount]=useState<Account|null>(null);
 const [admin,setAdmin]=useState<Admin|null>(null);
 const [isOwner,setIsOwner]=useState(false);
 const [modules,setModules]=useState<WorkspaceModule[]>([]);
 const [workspaceUnavailable,setWorkspaceUnavailable]=useState(false);
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const read=useCallback(async()=>{
  const [buyer,legacy]=await Promise.allSettled([
   fetch("/api/auth/parent/me",{cache:"no-store"}).then(async r=>r.ok?await r.json() as ParentStatus:null),
   fetch("/api/auth/me",{cache:"no-store"}).then(async r=>r.ok?(await r.json()).user as Admin:null),
  ]);
  const parent=buyer.status==="fulfilled"?buyer.value:null;
  const verified=parent?.user&&(parent.user.wechatId||parent.user.wechatOpenId)?parent.user:null;
  const old=legacy.status==="fulfilled"?legacy.value:null;
  setAccount(verified);
  setAdmin(old?.role==="admin"?old:null);
  // This is the existing authoritative parent-session field; the old
  // SessionNav used to ignore it and hide admin behind "My account".
  setIsOwner(Boolean(verified&&parent?.siteAdmin));
  setModules([]);
  setWorkspaceUnavailable(false);
  setLoaded(true);
  if(!verified)return;
  try{
   // Reuse the existing read-only platform authorization endpoint. It
   // returns only server-verified modules, not a user-supplied role.
   const response=await fetch("/api/platform/workspace",{cache:"no-store"});
   if(!response.ok)throw new Error("workspace unavailable");
   const result=await response.json() as WorkspaceStatus;
   setModules(Array.isArray(result.modules)?result.modules.filter(x=>
    typeof x.id==="string"&&typeof x.name==="string"&&
    typeof x.managementUrl==="string"&&x.managementUrl.startsWith("/")&&
    !x.managementUrl.startsWith("//")):[]);
   setIsOwner(Boolean(parent?.siteAdmin||result.siteOwner));
  }catch{
   // An unavailable authorization registry must not silently be reported
   // as "no teacher permissions", nor hide independently verified ownership.
   setWorkspaceUnavailable(true);
  }
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
  // The same browser may still hold a historical admin cookie. Clearing only
  // the WeChat session would otherwise leave that privileged session active.
  await Promise.allSettled([
   fetch("/api/auth/parent/logout",{method:"POST"}),
   fetch("/api/auth/logout",{method:"POST"}),
  ]);
  setOpen(false);setAccount(null);setAdmin(null);setIsOwner(false);
  setModules([]);router.replace("/login");router.refresh();
 }
 if(!loaded)return <span className={styles.accountSkeleton} aria-label="正在读取账号"/>;
 if(!account&&!admin)return <div className={styles.guestActions}>
  <Link className={styles.guestParent} href="/login?next=%2Faccount">
   <span>{lang==="zh"?"微信登录":"WeChat sign in"}</span>
   <small>{lang==="zh"?"一个账号，直接使用":"One account"}</small>
  </Link>
 </div>;
 const canAdmin=isOwner||admin?.role==="admin";
 const canTeach=modules.length>0;
 const shortcut=canAdmin?"/admin":canTeach?"/workspace":"/my/learning";
 const shortcutText=canAdmin?(lang==="zh"?"管理中心":"Admin center"):
  canTeach?(lang==="zh"?"教学工作台":"Teacher workspace"):
  (lang==="zh"?"学习中心":"Learner home");
 const label=account?.name||admin?.name||(lang==="zh"?"我的账号":"My account");
 const roleLabel=canAdmin?(lang==="zh"?"平台管理员":"Platform admin"):
  canTeach?(lang==="zh"?"教师 / 项目管理":"Teacher / manager"):
  account?(lang==="zh"?"微信学习账号":"WeChat learner"):"Admin";
 return <div className={styles.accountActions} ref={root}>
  <Link href={shortcut} className={styles.roleShortcut}
   aria-current={pathname===shortcut||pathname.startsWith(shortcut+"/")?"page":undefined}>
   {shortcutText}
  </Link>
  <div className={styles.accountRoot}>
   <button type="button" className={styles.accountTrigger} aria-haspopup="menu"
    aria-label={(lang==="zh"?"打开账户与工作空间菜单：":"Open account and workspace menu: ")+label}
    aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
    <span className={styles.accountAvatar+" "+(canAdmin?styles.avatar_admin:account?styles.avatar_parent:styles.avatar_student)}>
     {canAdmin?"管":canTeach?"教":account?"微":"用"}
    </span>
    <span className={styles.accountIdentity}><strong>{label}</strong><small>{roleLabel}</small></span>
   </button>
   {open&&<div className={styles.accountMenu} role="menu">
    <p className={styles.workspaceMenuTitle}>{lang==="zh"?"切换工作空间":"Switch workspace"}</p>
    <div className={styles.accountMenuLinks}>
     <Link href="/" onClick={()=>setOpen(false)} role="menuitem">
      {lang==="zh"?"浏览网站前台":"Public website"}
     </Link>
     {account&&<Link href="/my/learning" onClick={()=>setOpen(false)} role="menuitem">
      {lang==="zh"?"我的学习中心":"Learner home"}
     </Link>}
     {canTeach&&<Link href="/workspace" onClick={()=>setOpen(false)} role="menuitem">
      {lang==="zh"?"我的教学与项目工作台":"Teacher workspace"}
     </Link>}
     {canAdmin&&<Link href="/admin" className={styles.managementMenuLink}
      onClick={()=>setOpen(false)} role="menuitem">
      {lang==="zh"?"平台管理中心":"Platform admin center"}
     </Link>}
     {isOwner&&<Link href="/admin/platform-authorizations" onClick={()=>setOpen(false)} role="menuitem">
      {lang==="zh"?"模块与教师权限":"Manage module grants"}
     </Link>}
     {workspaceUnavailable&&!canTeach&&<p role="status" className={styles.workspaceNotice}>
      {lang==="zh"?"教学权限暂时无法查询":"Workspace permissions unavailable"}
     </p>}
    </div>
    <p className={styles.workspaceMenuTitle}>{lang==="zh"?"账户与服务":"Account & services"}</p>
    <div className={styles.accountMenuLinks}>
     {account&&<Link href="/account" onClick={()=>setOpen(false)} role="menuitem">
      {lang==="zh"?"我的账号与订单":"My account & orders"}
     </Link>}
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
  </div>
 </div>;
}
