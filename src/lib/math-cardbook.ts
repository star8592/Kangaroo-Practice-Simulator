import type { ExamAttemptRecord } from "./attempt-store";

export type MathCardRarity = "普通" | "稀有" | "超稀有" | "传说" | "神话";
export type MathCard = {
  id: string;
  kind: "竞赛卡" | "成就卡";
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  rarity: MathCardRarity;
  examId?: string;
  competitionId?: string;
  score?: number;
  maxScore?: number;
  completedAt: number;
  unlockText: string;
  unlockTextEn: string;
};

export type CardbookGoal = {
  mode: "first" | "upgrade" | "collect";
  currentPercent: number;
  targetPercent?: number;
  targetRarity?: MathCardRarity;
  examId?: string;
};

export type CardbookStats = {
  total: number;
  competition: number;
  achievements: number;
  mythic: number;
};

function rarityForPercent(pct: number): MathCardRarity {
  if (pct >= 96) return "神话";
  if (pct >= 90) return "传说";
  if (pct >= 80) return "超稀有";
  if (pct >= 70) return "稀有";
  return "普通";
}

function competitionName(id?: string) {
  if (id === "kangaroo") return { zh: "袋鼠数学", en: "Math Kangaroo" };
  if (id === "australian-amc") return { zh: "澳洲 AMC", en: "Australian AMC" };
  if (id === "maa-amc") return { zh: "美国 MAA 数学竞赛", en: "MAA AMC" };
  if (id === "cemc") return { zh: "加拿大 CEMC 数学竞赛", en: "CEMC" };
  return { zh: id || "数学挑战", en: id || "Math Challenge" };
}

function percent(score?: number, maxScore?: number) {
  return maxScore && maxScore > 0 ? Math.round(((score || 0) / maxScore) * 100) : 0;
}

export function buildMathCards(attempts: ExamAttemptRecord[]): MathCard[] {
  const formalAttempts = attempts
    .filter(a => a.profile.paperType !== "practice")
    .sort((a, b) => a.submittedAt - b.submittedAt);
  const bestByExam = new Map<string, MathCard>();

  for (const a of formalAttempts) {
    const pct = percent(a.grade.score, a.grade.maxScore);
    const key = a.examId || a.id;
    const competition = competitionName(a.profile.competitionId);
    const year = a.profile.year ? " · " + a.profile.year : "";
    const card: MathCard = {
      id: "exam:" + key,
      kind: "竞赛卡",
      title: "数学挑战者",
      titleEn: "Math Challenger",
      subtitle: competition.zh + year,
      subtitleEn: competition.en + year,
      rarity: rarityForPercent(pct),
      examId: a.examId,
      competitionId: a.profile.competitionId,
      score: a.grade.score,
      maxScore: a.grade.maxScore,
      completedAt: a.submittedAt,
      unlockText: "最佳战绩：" + a.grade.score + "/" + a.grade.maxScore,
      unlockTextEn: "Best score: " + a.grade.score + "/" + a.grade.maxScore,
    };

    const existing = bestByExam.get(key);
    const existingPct = existing ? percent(existing.score, existing.maxScore) : -1;
    if (!existing || pct > existingPct || (pct === existingPct && card.completedAt > existing.completedAt)) {
      bestByExam.set(key, card);
    }
  }

  const cards: MathCard[] = [...bestByExam.values()];

  const first = formalAttempts[0];
  if (first) {
    cards.push({
      id: "achievement:first-formal",
      kind: "成就卡",
      title: "初次出征",
      titleEn: "First Challenge",
      subtitle: "完成第一场正式数学挑战",
      subtitleEn: "Completed your first full math challenge",
      rarity: "稀有",
      completedAt: first.submittedAt,
      unlockText: "第一次认真完成一场正式挑战。",
      unlockTextEn: "Completed a full formal challenge for the first time.",
    });
  }

  const firstPerfect = formalAttempts.find(a => a.grade.maxScore > 0 && a.grade.score === a.grade.maxScore);
  if (firstPerfect) {
    cards.push({
      id: "achievement:first-perfect",
      kind: "成就卡",
      title: "满分时刻",
      titleEn: "Perfect Score",
      subtitle: "第一次完成满分挑战",
      subtitleEn: "Earned your first perfect score",
      rarity: "神话",
      completedAt: firstPerfect.submittedAt,
      unlockText: "第一次在正式挑战中拿到满分。",
      unlockTextEn: "Earned a perfect score in a formal challenge for the first time.",
    });
  }

  return cards.sort((a, b) => b.completedAt - a.completedAt);
}

export function buildCardbookStats(cards: MathCard[]): CardbookStats {
  return {
    total: cards.length,
    competition: cards.filter(card => card.kind === "竞赛卡").length,
    achievements: cards.filter(card => card.kind === "成就卡").length,
    mythic: cards.filter(card => card.rarity === "神话").length,
  };
}

export function buildCardbookGoal(cards: MathCard[]): CardbookGoal {
  const competitionCards = cards.filter(card => card.kind === "竞赛卡");
  if (!competitionCards.length) return { mode: "first", currentPercent: 0 };

  const best = competitionCards.reduce((winner, card) => {
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
