import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { loadExamAttempts } from "@/lib/attempt-store";
import { buildCardbookGoal, buildCardbookStats, buildMathCards } from "@/lib/math-cardbook";
import styles from "./CardsPage.module.css";

const RARITY_EN: Record<string,string> = {
  "普通":"Common",
  "稀有":"Rare",
  "超稀有":"Epic",
  "传说":"Legendary",
  "神话":"Mythic",
};

const NEW_CARD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function rarityLabel(value:string|undefined,lang:"zh"|"en"){
  if (!value) return lang==="zh"?"新卡":"NEW";
  return lang==="zh"?value:(RARITY_EN[value]||value);
}

export const dynamic = "force-dynamic";

export default async function StudentCardsPage() {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=/student/cards");

  const lang = jar.get("socthink_lang")?.value === "en" ? "en" : "zh";
  const cards = buildMathCards(loadExamAttempts(user.id, 500));
  const stats = buildCardbookStats(cards);
  const goal = buildCardbookGoal(cards);
  const now = Date.now();
  const goalHref = goal.mode === "upgrade" && goal.examId
    ? "/exam/" + encodeURIComponent(goal.examId)
    : "/competitions";

  const goalTitle = goal.mode === "upgrade"
    ? (lang === "zh" ? `下一张：${goal.targetRarity}卡` : `Next: ${rarityLabel(goal.targetRarity,lang)} card`)
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
        <p>{lang === "zh" ? `已经收集 ${stats.total} 张数学卡` : `${stats.total} math cards collected`}</p>
      </div>
      <Link className="secondary-button" href="/student">{lang === "zh" ? "返回学习报告" : "Back to report"}</Link>
    </div>

    {cards.length ? <>
      <section className={styles.stats}>
        <article><strong>{stats.competition}</strong><span>{lang === "zh" ? "竞赛卡" : "Challenge cards"}</span></article>
        <article><strong>{stats.achievements}</strong><span>{lang === "zh" ? "成就卡" : "Achievement cards"}</span></article>
        <article><strong>{stats.mythic}</strong><span>{lang === "zh" ? "神话卡" : "Mythic cards"}</span></article>
      </section>

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
          <div className={styles.lockedRarity}>{rarityLabel(goal.targetRarity,lang)}</div>
          <div className={styles.lock}>🔒</div>
          <strong>{lang === "zh" ? "下一张卡" : "Next Card"}</strong>
          <span>{goal.targetPercent ? `${goal.targetPercent}%+` : "?"}</span>
          <small>{lang === "zh" ? "继续挑战来解锁" : "Keep challenging to unlock"}</small>
        </div>
      </section>

      <div className={styles.grid}>
        {cards.map(card => {
          const isNew = card.completedAt > 0 && now - card.completedAt >= 0 && now - card.completedAt <= NEW_CARD_WINDOW_MS;
          const title = lang === "zh" ? card.title : card.titleEn;
          const subtitle = lang === "zh" ? card.subtitle : card.subtitleEn;
          const unlockText = lang === "zh" ? card.unlockText : card.unlockTextEn;
          return <article className={`${styles.card} ${card.kind === "成就卡" ? styles.achievementCard : ""}`} key={card.id}>
            {isNew ? <div className={styles.newBadge}>{lang === "zh" ? "新" : "NEW"}</div> : null}
            <div className={styles.rarity}>{rarityLabel(card.rarity,lang)}</div>
            <div className={styles.icon}>{card.kind === "成就卡" ? "🏆" : "★"}</div>
            <span className={styles.kind}>{lang === "zh" ? card.kind : (card.kind === "成就卡" ? "Achievement" : "Challenge")}</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
            {card.score !== undefined && card.maxScore !== undefined
              ? <strong>{card.score}/{card.maxScore}</strong>
              : <strong className={styles.unlocked}>{lang === "zh" ? "已解锁" : "Unlocked"}</strong>}
            <small>{new Date(card.completedAt).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}</small>
            <em>{unlockText}</em>
            <Link href={card.examId ? "/exam/" + encodeURIComponent(card.examId) : "/competitions"}>
              {card.kind === "成就卡"
                ? (lang === "zh" ? "继续收集 →" : "Keep collecting →")
                : (lang === "zh" ? "再挑战 →" : "Challenge again →")}
            </Link>
          </article>;
        })}
      </div>
    </> : <div className={styles.empty}>
      <div>🃏</div>
      <h2>{lang === "zh" ? "你的第一张卡正在等你" : "Your first card is waiting"}</h2>
      <p>{lang === "zh" ? "完成一次数学竞赛挑战，就能把第一张卡和“初次出征”成就一起收进卡册。" : "Complete a math challenge to collect your first card and the First Challenge achievement."}</p>
      <Link className="primary-button" href="/competitions">{lang === "zh" ? "去挑战" : "Start a challenge"}</Link>
    </div>}
  </main>;
}
