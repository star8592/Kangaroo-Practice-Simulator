import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { loadExamAttempts } from "@/lib/attempt-store";
import { buildCardbookGoal, buildMathCards } from "@/lib/math-cardbook";
import styles from "./CardsPage.module.css";

export const dynamic = "force-dynamic";

export default async function StudentCardsPage() {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/student/cards");

  const lang = jar.get("socthink_lang")?.value === "en" ? "en" : "zh";
  const cards = buildMathCards(loadExamAttempts(user.id, 500));
  const goal = buildCardbookGoal(cards);
  const goalHref = goal.mode === "upgrade" && goal.examId
    ? "/exam/" + encodeURIComponent(goal.examId)
    : "/competitions";

  const goalTitle = goal.mode === "upgrade"
    ? (lang === "zh" ? `下一张：${goal.targetRarity}卡` : `Next: ${goal.targetRarity} card`)
    : (lang === "zh" ? "下一张：新的挑战卡" : "Next: a new challenge card");
  const goalBody = goal.mode === "upgrade"
    ? (lang === "zh"
      ? `目前最好成绩 ${goal.currentPercent}%，冲到 ${goal.targetPercent}% 就能升级。`
      : `Your best is ${goal.currentPercent}%. Reach ${goal.targetPercent}% to upgrade this card.`)
    : (lang === "zh"
      ? "你已经拿到神话档战绩。换一套正式试卷，继续扩充卡册。"
      : "You reached Mythic. Try a different full paper to grow your collection.");

  return <main className={styles.page}>
    <div className={styles.top}>
      <div>
        <span className={styles.eyebrow}>MY CARD BOOK</span>
        <h1>{lang === "zh" ? "我的卡册" : "My Card Book"}</h1>
        <p>{lang === "zh" ? `已经收集 ${cards.length} 张数学卡` : `${cards.length} math cards collected`}</p>
      </div>
      <Link className="secondary-button" href="/student">{lang === "zh" ? "返回学习报告" : "Back to report"}</Link>
    </div>

    {cards.length ? <>
      <section className={styles.nextGoal}>
        <div className={styles.goalCopy}>
          <span className={styles.eyebrow}>NEXT CARD</span>
          <h2>{goalTitle}</h2>
          <p>{goalBody}</p>
          {goal.mode === "upgrade" && goal.targetPercent ? <div className={styles.progressWrap}>
            <div className={styles.progressLabels}><span>{goal.currentPercent}%</span><strong>{goal.targetPercent}%</strong></div>
            <div className={styles.progress}><i style={{ width: `${Math.min(100, Math.round(goal.currentPercent / goal.targetPercent * 100))}%` }} /></div>
          </div> : null}
          <Link className="primary-button" href={goalHref}>
            {goal.mode === "upgrade"
              ? (lang === "zh" ? "再挑战这套" : "Try this paper again")
              : (lang === "zh" ? "找一套新挑战" : "Find a new challenge")}
          </Link>
        </div>
        <div className={styles.lockedCard} aria-label={lang === "zh" ? "下一张未解锁卡" : "Next locked card"}>
          <div className={styles.lockedRarity}>{goal.targetRarity || (lang === "zh" ? "新卡" : "NEW")}</div>
          <div className={styles.lock}>🔒</div>
          <strong>{lang === "zh" ? "下一张卡" : "Next Card"}</strong>
          <span>{goal.targetPercent ? `${goal.targetPercent}%+` : "?"}</span>
          <small>{lang === "zh" ? "继续挑战来解锁" : "Keep challenging to unlock"}</small>
        </div>
      </section>

      <div className={styles.grid}>
        {cards.map(card => <article className={styles.card} key={card.id}>
          <div className={styles.rarity}>{card.rarity}</div>
          <div className={styles.icon}>★</div>
          <h2>{card.title}</h2>
          <p>{card.subtitle}</p>
          <strong>{card.score}/{card.maxScore}</strong>
          <small>{new Date(card.completedAt).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}</small>
          <Link href={card.examId ? "/exam/" + encodeURIComponent(card.examId) : "/competitions"}>
            {lang === "zh" ? "再挑战 →" : "Challenge again →"}
          </Link>
        </article>)}
      </div>
    </> : <div className={styles.empty}>
      <div>🃏</div>
      <h2>{lang === "zh" ? "你的第一张卡正在等你" : "Your first card is waiting"}</h2>
      <p>{lang === "zh" ? "完成一次数学竞赛挑战，就能把第一张卡收进卡册。" : "Complete a math challenge to collect your first card."}</p>
      <Link className="primary-button" href="/competitions">{lang === "zh" ? "去挑战" : "Start a challenge"}</Link>
    </div>}
  </main>;
}
