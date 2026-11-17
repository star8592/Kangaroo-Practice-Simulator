import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {isSiteOwner} from "@/lib/site-owner";
import {PLATFORM_SUBJECT_PATTERN} from "@/lib/platform-capabilities";
import PlatformGrantsAdminClient from "@/components/PlatformGrantsAdminClient";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import ops from "@/components/AdminOperations.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"平台模块授权管理｜SOC THINK",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{subject?:string|string[]}>}){
 const c=await cookies(),u=parentFromSessionToken(c.get(PARENT_SESSION_COOKIE)?.value);
 if(!u?.active||!(u.wechatId||u.wechatOpenId))redirect("/login?next=%2Fadmin%2Fplatform-authorizations");
 if(!isSiteOwner(u))redirect("/workspace");
 const incoming=(await searchParams).subject;
 const initialSubject=typeof incoming==="string"&&PLATFORM_SUBJECT_PATTERN.test(incoming)?incoming:"";
 return <div className={ops.shell}>
  <header className={ops.head}>
   <div>
    <span className={ops.eyebrow}>SOC THINK / ROLE MANAGEMENT</span>
    <h1>模块工作台入口权限</h1>
    <p>本页仅分配产品工作台入口，不授予实际任课资格、学生资料读取权。英语跟读任课请在「英语教务管理」单独开通。</p>
    <p><Link href="/admin/classroom">进入英语教务管理 · 实际任课授权</Link></p>
   </div>
   <Link href="/admin/users" className="secondary-button">返回用户列表</Link>
  </header>
  <AdminOperationsNav/>
  <PlatformGrantsAdminClient initialSubject={initialSubject}/>
 </div>;
}
