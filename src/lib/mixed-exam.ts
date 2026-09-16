import type { ExamBundle, ExamProfile, Question } from "./types";

export type MixedKind = "mixed24" | "mixed15";

type Candidate = {
  q: Question;
  sourceExamId: string;
  sourceQuestionNo: number;
  year: number;
  jitter: number;
};

const BASE: Record<MixedKind, ExamProfile> = {
  mixed24: {
    id: "mixed24", name: "历年智能混合卷 · 24题", grades: "Grades 1–2",
    durationSeconds: 75 * 60, questionCount: 24, initialScore: 24, maxScore: 120,
    wrongPenaltyMode: "fixed", wrongPenaltyValue: 1, country: "Mixed",
    language: "zh/en", nameZh: "历年智能混合卷 · 24题", nameEn: "Smart Mixed Mock · 24 Questions",
    gradesZh: "1–2年级", gradesEn: "Grades 1–2",
    sourceLabelZh: "跨年份平衡组卷 · 每次生成新卷", sourceLabelEn: "Balanced across years · a fresh paper every time",
    studentReady: true,
  },
  mixed15: {
    id: "mixed15", name: "历年快速混合卷 · 15题", grades: "Grade 2",
    durationSeconds: 75 * 60, questionCount: 15, initialScore: 15, maxScore: 75,
    wrongPenaltyMode: "quarter-points", wrongPenaltyValue: 0.25, country: "Mixed",
    language: "zh/en", nameZh: "历年快速混合卷 · 15题", nameEn: "Quick Mixed Mock · 15 Questions",
    gradesZh: "二年级", gradesEn: "Grade 2",
    sourceLabelZh: "5道3分 + 5道4分 + 5道5分", sourceLabelEn: "5×3-point + 5×4-point + 5×5-point",
    studentReady: true,
  },
};
function hashSeed(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mixedProfiles() {
  return [BASE.mixed24, BASE.mixed15].map((p) => ({ ...p }));
}

export function parseMixedExamId(examId: string): { kind: MixedKind; seed: string } | null {
  const m = /^(mixed24|mixed15)-([A-Za-z0-9_-]+)$/.exec(examId);
  return m ? { kind: m[1] as MixedKind, seed: m[2] } : null;
}

function quotas(kind: MixedKind): Record<3 | 4 | 5, number> {
  return kind === "mixed24" ? { 3: 8, 4: 8, 5: 8 } : { 3: 5, 4: 5, 5: 5 };
}
function chooseBalanced(kind: MixedKind, seed: string, bundles: ExamBundle[]) {
  const rand = mulberry32(hashSeed(`${kind}:${seed}`));
  const candidates: Candidate[] = [];
  for (const bundle of [...bundles].sort((a, b) => a.profile.id.localeCompare(b.profile.id))) {
    for (const q of bundle.questions) {
      candidates.push({
        q, sourceExamId: bundle.profile.id, sourceQuestionNo: q.questionNo,
        year: q.year || bundle.profile.year || 0, jitter: rand(),
      });
    }
  }

  const need = quotas(kind);
  const yearCap = kind === "mixed24" ? 3 : 2;
  const selected: Candidate[] = [];
  const used = new Set<string>();
  const yearCount = new Map<number, number>();

  for (const points of [3, 4, 5] as const) {
    const bandYearCount = new Map<number, number>();
    const posCount = new Map<number, number>();
    for (let slot = 0; slot < need[points]; slot += 1) {
      const options = candidates.filter((c) =>
        c.q.points === points && !used.has(c.q.id) && (yearCount.get(c.year) ?? 0) < yearCap
      );
      options.sort((a, b) =>
        (bandYearCount.get(a.year) ?? 0) - (bandYearCount.get(b.year) ?? 0) ||
        (yearCount.get(a.year) ?? 0) - (yearCount.get(b.year) ?? 0) ||
        (posCount.get(a.sourceQuestionNo) ?? 0) - (posCount.get(b.sourceQuestionNo) ?? 0) ||
        a.jitter - b.jitter
      );
      const pick = options[0];
      if (!pick) throw new Error(`Not enough ${points}-point questions for ${kind}`);
      selected.push(pick); used.add(pick.q.id);
      yearCount.set(pick.year, (yearCount.get(pick.year) ?? 0) + 1);
      bandYearCount.set(pick.year, (bandYearCount.get(pick.year) ?? 0) + 1);
      posCount.set(pick.sourceQuestionNo, (posCount.get(pick.sourceQuestionNo) ?? 0) + 1);
    }
  }
  return selected;
}
export function buildMixedBundle(kind: MixedKind, seed: string, bundles: ExamBundle[]): ExamBundle {
  if (!bundles.length) throw new Error("No student-ready archive bundles are available");
  const picks = chooseBalanced(kind, seed, bundles);
  const questions = picks.map((c, index) => {
    const oldMeta = c.q.sourceMeta && typeof c.q.sourceMeta === "object" && !Array.isArray(c.q.sourceMeta)
      ? c.q.sourceMeta as Record<string, unknown> : {};
    return {
      ...c.q,
      questionNo: index + 1,
      sourceMeta: {
        ...oldMeta,
        mixedSourceExamId: c.sourceExamId,
        mixedSourceQuestionNo: c.sourceQuestionNo,
      },
    };
  });
  const years = [...new Set(picks.map((p) => p.year).filter(Boolean))].sort((a, b) => a - b);
  const span = years.length ? `${years[0]}–${years[years.length - 1]}` : "archive";
  const tag = seed.slice(-6).toUpperCase();
  const base = BASE[kind];
  const profile: ExamProfile = {
    ...base,
    id: `${kind}-${seed}`,
    name: `${base.name} #${tag}`,
    nameZh: `${base.nameZh} #${tag}`,
    nameEn: `${base.nameEn} #${tag}`,
    sourceLabelZh: `${span} 历年真题平衡组卷 · Seed ${tag}`,
    sourceLabelEn: `${span} balanced past-paper mix · Seed ${tag}`,
  };
  return { profile, questions };
}
