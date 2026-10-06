import type { ExamAttemptRecord } from "./attempt-store";

export type MathCardRarity = "普通" | "稀有" | "超稀有" | "传说" | "神话";
export type MathCard = {
  id: string;
  kind: "竞赛卡" | "成就卡";
  title: string;
  subtitle: string;
  rarity: MathCardRarity;
  examId?: string;
  competitionId?: string;
  score?: number;
  maxScore?: number;
  completedAt: number;
  unlockText: string;
};

export type CardbookGoal = {
  mode: "first" | "upgrade" | "collect";
  currentPercent: number;
  targetPercent?: number;
  targetRarity?: MathCardRarity;
  examId?: string;
};

function rarityForPercent(pct: number): MathCardRarity {
  if (pct >= 96) return "神话";
  if (pct >= 90) return "传说";
  if (pct >= 80) return "超稀有";
  if (pct >= 70) return "稀有";
  return "普通";
}

function competitionName(id?: string) {
  if (id === "kangaroo") return "袋鼠数学";
  if (id === "australian-amc") return "澳洲 AMC";
  if (id === "maa-amc") return "美国 MAA 数学竞赛";
  if (id === "cemc") return "加拿大 CEMC 数学竞赛";
  return id || "数学挑战";
}

function percent(score?: number, maxScore?: number) {
  return maxScore && maxScore > 0 ? Math.round(((score || 0) / maxScore) * 100) : 0;
}

export function buildMathCards(attempts: ExamAttemptRecord[]): MathCard[] {
  const bestByExam = new Map<string, MathCard>();

  for (const a of attempts) {
    if (a.profile.paperType === "practice") continue;
    const pct = percent(a.grade.score, a.grade.maxScore);
    const key = a.examId || a.id;
    const card: MathCard = {
      id: "exam:" + key,
      kind: "竞赛卡",
      title: "数学挑战者",
      subtitle: competitionName(a.profile.competitionId) + (a.profile.year ? " · " + a.profile.year : ""),
      rarity: rarityForPercent(pct),
      examId: a.examId,
      competitionId: a.profile.competitionId,
      score: a.grade.score,
      maxScore: a.grade.maxScore,
      completedAt: a.submittedAt,
      unlockText: "最佳战绩：" + a.grade.score + "/" + a.grade.maxScore,
    };

    const existing = bestByExam.get(key);
    const existingPct = existing ? percent(existing.score, existing.maxScore) : -1;
    if (!existing || pct > existingPct || (pct === existingPct && card.completedAt > existing.completedAt)) {
      bestByExam.set(key, card);
    }
  }

  return [...bestByExam.values()].sort((a, b) => b.completedAt - a.completedAt);
}

export function buildCardbookGoal(cards: MathCard[]): CardbookGoal {
  if (!cards.length) return { mode: "first", currentPercent: 0 };

  const best = cards.reduce((winner, card) => {
    const winnerPct = percent(winner.score, winner.maxScore);
    const cardPct = percent(card.score, card.maxScore);
    if (cardPct !== winnerPct) return cardPct > winnerPct ? card : winner;
    return card.completedAt > winner.completedAt ? card : winner;
  });
  const currentPercent = percent(best.score, best.maxScore);

  if (currentPercent < 70) return { mode: "upgrade", currentPercent, targetPercent: 70, targetRarity: "稀有", examId: best.examId };
  if (currentPercent < 80) return { mode: "upgrade", currentPercent, targetPercent: 80, targetRarity: "超稀有", examId: best.examId };
  if (currentPercent < 90) return { mode: "upgrade", currentPercent, targetPercent: 90, targetRarity: "传说", examId: best.examId };
  if (currentPercent < 96) return { mode: "upgrade", currentPercent, targetPercent: 96, targetRarity: "神话", examId: best.examId };
  return { mode: "collect", currentPercent, examId: best.examId };
}
