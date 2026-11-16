import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {isSiteOwner} from "@/lib/site-owner";
import {myAuthorizedModules} from "@/lib/platform-grants";
import styles from "./workspace.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"我的管理工作台｜SOC THINK",robots:{index:false,follow:false}};
export default async function Page(){
 const jar=await cookies();
 const me=parentFromSessionToken(jar.get(PARENT_SESSION_COOKIE)?.value);
 if(!me?.active||!(me.wechatId||me.wechatOpenId))redirect("/login?next=%2Fworkspace");
 let modules:Awaited<ReturnType<typeof myAuthorizedModules>>=[];
 let unavailable=false;
 try{modules=await myAuthorizedModules(me.id)}catch{unavailable=true}
 const owner=isSiteOwner(me);
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb}><Link href="/">SOC THINK</Link><span>/</span>我的工作台</nav>
  <header className={styles.hero}>
   <small>SOC THINK · WORKSPACE</small>
   <h1>我的管理工作台</h1>
   <p>{me.name}，这里仅显示已授权给你的管理模块。没有权限的产品不会干扰你的工作。</p>
  </header>
  {unavailable?<section role="alert" className={styles.notice}>
   <h2>权限服务暂时无法连接</h2>
   <p>为避免错误展示管理权限，已暂停加载模块；原产品工作台和学习记录没有被修改。</p>
  </section>:modules.length===0?<section className={styles.notice}>
   <h2>尚未获得项目管理权限</h2>
   <p>平台管理员授权后，这里才会出现相应模块。普通课程可以从学习首页打开。</p>
   <Link href="/english">浏览学习课程</Link>
  </section>:<section aria-labelledby="my-modules">
   <h2 id="my-modules">我管理的模块</h2>
   <div className={styles.modules}>{modules.map(m=><article key={m.id} className={styles.module}>
    <small>{m.product}</small><h3>{m.name}</h3>
    <p>{m.grants.some(g=>g.role==="module-admin")?"项目管理权限":"任课教师权限"} ·
      具体班级与学生数据由业务系统核验。</p>
    <Link href={m.managementUrl}>进入管理 <span aria-hidden="true">→</span></Link>
   </article>)}</div>
  </section>}
  {owner&&<p className={styles.owner}><Link href="/admin/platform-authorizations">平台管理员 · 管理模块授权</Link></p>}
 </div>;
}
