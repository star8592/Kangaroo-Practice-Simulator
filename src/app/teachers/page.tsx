import Link from "next/link";
import {tx} from "@/lib/classroom-web-core";
import {classInvitationLink} from "@/lib/classroom-invitations";
import {studentFeeModeLabel} from "@/lib/teacher-pilot-policy";
import styles from "./teachers.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"找老师与加入学习班｜SOC THINK",description:"浏览教师自愿公开的英语跟读班级。可自行学习，也可选择老师和班级申请加入。"};
type PublicListing={
 tenant_id:string;class_id:string;listing_class_name:string;
 listing_teacher_name:string;listing_intro:string;rotation:string;student_fee_mode:string;
};

async function publicListings():Promise<PublicListing[]>{
 return tx({},async db=>{
  // Public opt-in RLS. No account or tenant override and no private roster access.
  const res=await db.query<PublicListing>([
   "SELECT tenant_id,class_id,listing_class_name,listing_teacher_name,listing_intro,rotation,student_fee_mode",
   "FROM accent.class_invitations WHERE discoverable=true AND enabled=true",
   "AND listing_intro IS NOT NULL AND listing_class_name IS NOT NULL",
   "AND listing_teacher_name IS NOT NULL",
   "ORDER BY updated_at DESC LIMIT 60"
  ].join(" "));
  return res.rows;
 });
}

export default async function FindTeacher(){
 let listings:PublicListing[]=[];let unavailable=false;
 try{listings=await publicListings();}catch{unavailable=true;}
 return <div className={styles.shell}>
  <nav className={styles.breadcrumb}><Link href="/">SOC THINK</Link><span>/</span>找老师</nav>
  <header className={styles.hero}>
   <span className={styles.kicker}>LEARN YOUR WAY</span>
   <h1>想跟老师学？自己选。</h1>
   <p>自学始终开放，不必加入任何班级。想获得老师安排的练习与针对性反馈时，可以选择加入真实开放的教学班级。</p>
   <div className={styles.heroLinks}><Link href="/my/learning">继续自主学习</Link><Link href="/teach">我是老师 · 管理教学</Link></div>
  </header>
  <section aria-labelledby="available-classes" className={styles.section}>
   <div className={styles.heading}><div><span className={styles.kicker}>TEACHER CLASSES</span><h2 id="available-classes">老师开放的班级</h2></div>
    <p>老师主动公开 · 学生自主选择 · 申请后由老师审核</p>
   </div>
   {unavailable?<div className={styles.notice} role="alert">班级目录暂时无法加载。可以继续自主学习，已持有老师邀请链接的学生仍能从原链接申请入班。</div>:null}
   {!unavailable&&listings.length===0?<div className={styles.notice}><strong>目前没有公开招生的班级</strong><p>老师尚未将班级公开到目录。收到老师发来的微信邀请链接或二维码，仍可直接申请入班。</p><Link href="/english">直接学英语</Link></div>:null}
   {!unavailable&&listings.length>0?<div className={styles.grid}>
    {listings.map(c=><article key={c.tenant_id+":"+c.class_id} className={styles.card}>
      <span className={styles.tag}>英语跟读</span><h3>{c.listing_class_name}</h3>
      <p className={styles.teacher}>任课教师：{c.listing_teacher_name}</p>
      <p className={styles.intro}>{c.listing_intro}</p>
      <p className={styles.fine}>{studentFeeModeLabel(c.student_fee_mode)}</p>
      <p className={styles.fine}>老师使用平台免费 · 班级审核制 · 平台不代收学费、不抽取教学佣金</p>
      <Link href={classInvitationLink(c.tenant_id,c.class_id,c.rotation)}>查看并申请加入 →</Link>
    </article>)}
   </div>:null}
  </section>
  <section className={styles.section}>
    <h2>加入班级后，还能继续自学吗？</h2>
    <p>可以。加入班级只是增加教师作业和针对性反馈，不会清空已有的自主练习记录。老师只能查看其班级授权范围内的学习活动。SOC THINK 现阶段免费向老师提供教学工具；老师与学生之间的课程费用可由老师独立安排，本平台暂不参与收款或分账。</p>
    <Link href="/my/learning">回到我的学习中心</Link>
  </section>
 </div>;
}
