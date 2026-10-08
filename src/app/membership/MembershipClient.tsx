"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/lib/site-language";
import { publicAccessCatalog } from "@/lib/access-catalog";
import type { IdentityKind, Plan } from "@/lib/access-policy";
import styles from "./MembershipPage.module.css";

const catalog=publicAccessCatalog();
type TierId = "guest" | Plan;
export default function MembershipClient({identity,plan,ledgerAvailable}:{
  identity:IdentityKind;plan:Plan;ledgerAvailable:boolean;
}) {
  const lang=useSiteLanguage();
  const en=lang==="en";
  const active:TierId=identity==="guest" || identity==="anonymous"?"guest":plan;
  const current=catalog.plans.find(item=>item.id===active);
  return <main className={styles.page}>
    <section className={styles.hero}>
      <small>{en?"MEMBERSHIP & LEARNING ACCESS":"学习权益 · 公开透明"}</small>
      <h1>{en?"Learn freely. Upgrade for deeper guidance.":"基础学习始终开放，深度服务按需选择"}</h1>
      <p>{en
        ?"Guests can try public exams. Registered learners keep their study records. Paid plans focus on personalization and family support."
        :"游客直接做公开样题，注册后保存长期成长档案。未来会员将主要提供个性化诊断、智能组卷和家庭管理，不影响现有免费学习。"}
      </p>
      <div className={styles.status}>
        <b>{en?"Your access":"当前权益"}：{current ? (en?current.en:current.zh) : active.toUpperCase()}</b>
        <span>{!ledgerAvailable ? (en?"Entitlements temporarily unavailable":"会员权益暂时无法读取，请稍后重试") :
          (en?"No payment or checkout is enabled yet.":"正式收费尚未开放，当前不会向您收款。")}</span>
      </div>
    </section>
    <section className={styles.cards} aria-label={en?"Plan overview":"权益级别"}>
      {catalog.plans.map(item=><article key={item.id} className={styles.card+(active===item.id?" "+styles.current:"")}>
        <small>{item.id.toUpperCase()}{active===item.id?(en?" · CURRENT":" · 当前"):null}</small>
        <h2>{en?item.en:item.zh}</h2>
        <p>{en
          ? (item.id==="guest"?"Try public questions and arithmetic.":item.id==="free"?"Save study history.":item.id==="plus"?"Personalized family learning.":"More in-depth AI guidance.")
          :item.description}</p>
        <em>{item.familySeats? (en?"Up to "+item.familySeats+" children":"最多 "+item.familySeats+" 名学生") :
          (en?"No account needed":"无需注册即可体验")}</em>
      </article>)}
    </section>
    <h2>{en?"Feature comparison":"功能与权益对照"}</h2>
    <div className={styles.tableOuter}>
      <table className={styles.table}>
        <thead><tr><th>{en?"Learning features":"学习功能"}</th>{catalog.plans.map(p=><th key={p.id}>{en?p.en:p.zh}</th>)}</tr></thead>
        <tbody>{catalog.features.map(feature=><tr key={feature.id}>
          <td>{en?feature.en:feature.zh}</td>
          {catalog.plans.map(p=>{
            const allowed=Boolean(feature.tiers[p.id]);
            return <td key={p.id} aria-label={(en?p.en:p.zh)+(allowed?(en?" available":" 可用"):(en?" not included":" 不包含"))}>
              <span className={allowed?styles.yes:styles.no}>{allowed?"✓":"—"}</span>
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className={styles.note}>{en
      ?"The feature comparison is a proposed plan structure, not a statement that paid checkout is live. Access to published questions also depends on source permissions and quality review."
      :"以上为计划实施的权益矩阵，不代表已开通收款或已经交付全部高级功能。题目是否可展示仍以来源授权与内容审核为准。会员失效后，历史基础成绩不会被删除。"}
    </p>
    <div className={styles.actions}>
      <Link href="/exam/au-amc-pre-a-sample-2">{en?"Try a free sample":"免费体验 AMC 样题"}</Link>
      <Link href="/parent/login">{en?"Parent account":"家长账号"}</Link>
      <Link href="/login">{en?"Student login":"学生登录"}</Link>
    </div>
  </main>;
}
