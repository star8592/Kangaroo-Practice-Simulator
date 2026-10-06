import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {SESSION_COOKIE,userFromSessionToken} from "@/lib/auth";
import {buildAcademicCalendar} from "@/lib/academic-events/calendar";
import styles from "./page.module.css";
export const dynamic="force-dynamic";
export default async function Page(){const jar=await cookies();const user=userFromSessionToken(jar.get(SESSION_COOKIE)?.value);if(!user||user.role!=="student")redirect("/login?next=/student/calendar");const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Shanghai"});const rows=buildAcademicCalendar(user,today);return <main className={styles.shell}><header><div><span>MY ACADEMIC CALENDAR</span><h1>我的赛历</h1><p>只放你已经关注、计划或报名的事项。赛事发现留在赛事大厅，这里负责把事情推进完。</p></div><Link className="secondary-button" href="/student">返回学习报告</Link></header>{rows.length?rows.map(row=><section className={styles.session} key={row.session.id}><div className={styles.sessionHead}><div><small>{row.session.season} · {row.session.region}</small><h2>{row.event.titleZh}</h2></div><strong>{row.stage}</strong></div><div className={styles.timeline}>{row.milestones.map(m=><article key={m.id} className={m.start<today?styles.past:""}><time>{m.start.slice(5)}</time><i/><div><b>{m.titleZh}</b><small>{m.kind}</small></div></article>)}</div></section>):<section className={styles.empty}><h2>赛历还是空的</h2><p>在赛事大厅关注或计划参加赛事后，它才会进入这里。我们不会把所有比赛都塞给你。</p><Link className="primary-button" href="/competitions">去赛事大厅</Link></section>}</main>}
