import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {isSiteOwner} from "@/lib/site-owner";
import {PLATFORM_SUBJECT_PATTERN} from "@/lib/platform-capabilities";
import PlatformGrantsAdminClient from "@/components/PlatformGrantsAdminClient";
import styles from "./admin.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"平台模块授权管理｜SOC THINK",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{subject?:string|string[]}>}){
 const c=await cookies(),u=parentFromSessionToken(c.get(PARENT_SESSION_COOKIE)?.value);
 if(!u?.active||!(u.wechatId||u.wechatOpenId))redirect("/login?next=%2Fadmin%2Fplatform-authorizations");
 if(!isSiteOwner(u))redirect("/workspace");
 const incoming=(await searchParams).subject;
 const initialSubject=typeof incoming==="string"&&PLATFORM_SUBJECT_PATTERN.test(incoming)?incoming:"";
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb}><Link href="/workspace">管理工作台</Link><span>/</span>平台授权</nav>
  <h1>模块授权管理</h1>
  <p className={styles.lead}>为已登录微信的教师增加或移除项目。授权修改将被记录；不会因此更改原有班级、课程和学生资料。</p>
  <PlatformGrantsAdminClient initialSubject={initialSubject}/>
 </div>;
}
