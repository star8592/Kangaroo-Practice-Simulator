import Link from "next/link";
import {cookies} from "next/headers";
import {englishRoleEntries,type EnglishAudience} from "@/lib/english-role-hubs";
import {parentFromSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import styles from "@/app/english/english.module.css";

export default async function EnglishRoleHub({audience}:{audience:EnglishAudience}){
  const teacher=audience==="teacher";
  const cookieJar=await cookies();
  const user=parentFromSessionToken(cookieJar.get(PARENT_SESSION_COOKIE)?.value);
  const wechatSignedIn=Boolean(user?.active&&(user.wechatId||user.wechatOpenId));
  const entries=englishRoleEntries(audience);
  const selfPath=teacher?"/english/teacher":"/english/student";
  return <div className={styles.shell}>
    <nav className={styles.breadcrumb} aria-label="英语学习路径">
      <Link href="/">SOC THINK</Link><span>/</span>
      <Link href="/english">英语学习</Link><span>/</span>
      <span aria-current="page">{teacher?"教师":"学生"}</span>
    </nav>
    <header className={styles.hero}>
      <span className={styles.kicker}>ENGLISH LEAP · {teacher?"TEACHER":"LEARNER"}</span>
      <h1>{teacher?"英语教师工作入口":"我的英语学习"}</h1>
      <p>{teacher?"从一个地方进入发音、单词和阅读工具。原有班级、作业和成绩保持不变。":
        "选择今天要做的学习任务。单词、发音和阅读都从这里进入，不必再寻找四个网站。"}</p>
      <div className={styles.roleSession}>
        <span className={styles.sessionState}>{wechatSignedIn?"主站微信已登录":"尚未登录主站微信"}</span>
        {!wechatSignedIn&&<Link className={styles.sessionLogin} href={"/login?next="+encodeURIComponent(selfPath)}>微信登录</Link>}
      </div>
    </header>
    <nav aria-label="教师与学生入口" className={styles.audienceTabs}>
      <Link aria-current={teacher?"page":undefined} href="/english/teacher">我是老师</Link>
      <Link aria-current={!teacher?"page":undefined} href="/english/student">我是学生</Link>
    </nav>
    <div className={styles.workbenchLead}>
      <div>
        <h2>{teacher?"今天要使用哪项教学工具？":"今天想先练什么？"}</h2>
        <p>{teacher?"先进入任课模块，再查看真实班级和作业。没有合并过的成绩不会显示成平台总成绩。":
          "老师发来的专属作业链接仍然可以直接打开；这里提供常用学习入口。"}</p>
      </div>
      <span>{entries.length} 个教学引擎</span>
    </div>
    <nav className={styles.roleToolGrid} aria-label={teacher?"教师教学工具":"学生学习工具"}>
      {entries.map(item=><article className={styles.roleTool} key={item.id}>
        <div className={styles.roleToolTop}>
          <span className={styles.icon} aria-hidden="true">{item.icon}</span>
          <div><small>{item.product}</small><h3>{item.name}</h3></div>
        </div>
        <p>{item.description}</p>
        {teacher&&<span className={item.classroomReady?styles.classroomReady:styles.contentOnly}>
          {item.classroomReady?"独立课堂可用":"仅开放内容入口"}
        </span>}
        <Link href={item.url} className={styles.roleToolAction}>{item.action}<span aria-hidden="true">→</span></Link>
      </article>)}
    </nav>
    <section className={styles.roleScopeNote} aria-label="账号和权限说明">
      <strong>{teacher?"一个微信入口，不等于自动拥有教师权限":"一个微信入口，原学习记录不丢失"}</strong>
      <p>{teacher
        ?"目前各模块仍独立核验授课权限。词语星球首次需要核实原教师账号并关联微信；阅读和高阶阅读尚未接入统一班级管理。这里不生成虚假的班级或学情数据。"
        :"词语星球首次使用需要核实原学生账号并关联微信。发音、阅读与单词记录尚未合并；系统不会因为名字相同而自动合并不同学生的成绩。"}
      </p>
    </section>
    <div className={styles.back}><Link href="/english">返回英语学习首页</Link></div>
  </div>;
}
