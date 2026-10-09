import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
import {buildAcademicCalendar} from "@/lib/academic-events/calendar";
import {buildWorldFollowedCalendar} from "@/lib/world-followed-calendar";
import styles from "./page.module.css";
export const dynamic="force-dynamic";

export default async function Page(){
  const jar=await cookies();
  const user=userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if(!user||user.role!=="student")redirect("/login?next=/student/calendar");
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Shanghai"});
  const rows=buildAcademicCalendar(user,today);
  const followed=buildWorldFollowedCalendar(user.id,today);
  const nextActions=followed.filter(x=>x.nextTaskZh).slice(0,3);
  return <main className={styles.shell}>
    <header>
      <div><span>MY WORLD MATH CALENDAR</span><h1>我的数学赛历</h1>
        <p>关注全球赛事，不等于已报名某届比赛。这里分别记录备赛待办与已经核验的具体考试日期。</p></div>
      <Link className="secondary-button" href="/competitions">发现更多赛事</Link>
    </header>
    <section className={styles.session} aria-label="接下来最值得做的三件事">
      <div className={styles.sessionHead}><h2>下一步行动</h2><strong>最多显示三项</strong></div>
      {nextActions.length?nextActions.map(x=><article className={styles.focusTask} key={x.eventId}>
        <div><b>{x.nameZh}</b><p>{x.nextTaskZh}</p></div>
        <Link href={"/competitions?event="+encodeURIComponent(x.eventId)}>去完成 →</Link>
      </article>):<p>还没有待推进的关注赛事。可以先从全球赛事目录关注感兴趣的比赛。</p>}
      <p className={styles.note}>未核验官方日期的事项属于本站备赛建议，不会显示虚假的报名倒计时。</p>
    </section>
    <section aria-label="我关注的世界赛事">
      <h2 className={styles.groupTitle}>已关注的全球赛事 · {followed.length}</h2>
      {followed.length?followed.map(x=><article className={styles.session} key={x.eventId}>
        <div className={styles.sessionHead}><div><small>{x.region} · 全球赛事档案</small><h2>{x.nameZh}</h2></div><strong>清单 {x.completed}/{x.total}</strong></div>
        <p>{x.nextTaskZh?("下一步："+x.nextTaskZh):"当前备赛清单已完成"}</p>
        <p className={styles.note}>具体赛区报名及考试日期：按当届官方公告核实；关注不代表报名成功。</p>
        <Link className="secondary-button" href={"/competitions?event="+encodeURIComponent(x.eventId)}>打开赛事管家 →</Link>
      </article>):<section className={styles.empty}><h2>暂未关注赛事</h2><p>你可以自由关注世界各地的数学赛事。关注后在这里集中管理备赛，不必重复搜索信息。</p><Link className="primary-button" href="/competitions">选择想关注的赛事</Link></section>}
    </section>
    <section aria-label="已核验的具体比赛场次">
      <h2 className={styles.groupTitle}>具体考试场次与日期</h2>
      {rows.length?rows.map(row=><section className={styles.session} key={row.session.id}>
        <div className={styles.sessionHead}><div><small>{row.session.season} · {row.session.region}</small><h2>{row.event.titleZh}</h2></div><strong>{row.stage}</strong></div>
        <div className={styles.timeline}>{row.milestones.map(m=><article key={m.id} className={m.start<today?styles.past:""}><time>{m.start.slice(5)}</time><i/><div><b>{m.titleZh}</b><small>{m.kind}</small></div></article>)}</div>
      </section>):<p className={styles.note}>尚未添加有明确赛区和日期的报名/参赛计划。仅关注赛事不会自动创建参赛记录。</p>}
    </section>
  </main>;
}
