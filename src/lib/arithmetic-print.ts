import { type ArithmeticGrade, type CleverNode } from "./arithmetic";
import type { TrainingPlan } from "./arithmetic-analytics";
import { generateArithmeticSet, type ArithmeticItem } from "./arithmetic-generator";

export type ArithmeticPrintMode = "smart" | "mixed" | "manual";
export type ArithmeticPrintSource = "repair" | "consolidate" | "review" | "manual" | "mixed";

export type ArithmeticPrintItem = ArithmeticItem & {
  printSource: ArithmeticPrintSource;
};

export type ArithmeticWorksheet = {
  index: number;
  seed: number;
  code: string;
  items: ArithmeticPrintItem[];
  mix: { repair: number; consolidate: number; review: number };
  personalized: boolean;
};

function seededShuffle<T>(items: T[], seed: number) {
  let state = seed >>> 0;
  const rand = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function takeItems(
  pool: ArithmeticItem[],
  count: number,
  seen: Set<string>,
  source: ArithmeticPrintSource,
): ArithmeticPrintItem[] {
  if (count <= 0 || pool.length === 0) return [];
  const picked: ArithmeticPrintItem[] = [];

  for (const item of pool) {
    if (picked.length >= count) break;
    if (seen.has(item.prompt)) continue;
    seen.add(item.prompt);
    picked.push({ ...item, printSource: source });
  }

  let cursor = 0;
  while (picked.length < count && pool.length > 0) {
    const item = pool[cursor % pool.length];
    picked.push({
      ...item,
      id: `${item.id}-print-${source}-${picked.length}`,
      printSource: source,
    });
    cursor += 1;
  }
  return picked;
}

function strictSkillPool(
  grade: ArithmeticGrade,
  count: number,
  seed: number,
  skills: string[],
): ArithmeticItem[] {
  if (!skills.length || count <= 0) return [];
  const out: ArithmeticItem[] = [];
  for (let round = 0; round < 16 && out.length < count * 4; round += 1) {
    const batch = generateArithmeticSet(
      grade,
      Math.max(32, count * 3),
      seed + round * 65537,
      skills,
      false,
      [],
    ).filter((item) => skills.includes(item.skillId));
    out.push(...batch);
  }
  return out;
}

function nodePool(
  grade: ArithmeticGrade,
  count: number,
  seed: number,
  skills: string[],
  nodes: CleverNode[],
): ArithmeticItem[] {
  if (!nodes.length || count <= 0) return [];
  const requested = Math.max(24, Math.ceil(count / 0.6) + 8);
  const out: ArithmeticItem[] = [];
  for (let round = 0; round < 8 && out.length < count * 3; round += 1) {
    const batch = generateArithmeticSet(
      grade,
      requested,
      seed + round * 104729,
      skills,
      false,
      nodes,
    ).filter((item) => item.strategyNode && nodes.includes(item.strategyNode));
    out.push(...batch);
  }
  return out;
}

function smartItems(
  grade: ArithmeticGrade,
  count: number,
  seed: number,
  plan: TrainingPlan,
): Pick<ArithmeticWorksheet, "items" | "mix" | "personalized"> {
  const evidenceQuestions = plan.metrics.reduce((sum, metric) => sum + metric.attempts, 0);
  const hasFocus = plan.focusSkills.length > 0 || plan.focusNodes.length > 0;

  if (evidenceQuestions === 0 || !hasFocus) {
    const items = generateArithmeticSet(grade, count, seed, [], false, []).map((item) => ({
      ...item,
      printSource: "review" as const,
    }));
    return {
      items,
      mix: { repair: 0, consolidate: 0, review: items.length },
      personalized: false,
    };
  }

  const repairTarget = Math.round(count * 0.6);
  const consolidateTarget = Math.round(count * 0.25);
  const reviewTarget = Math.max(0, count - repairTarget - consolidateTarget);
  const seen = new Set<string>();

  const nodeCandidates = nodePool(
    grade,
    repairTarget,
    seed ^ 0x13579bdf,
    plan.focusSkills,
    plan.focusNodes,
  );
  const skillCandidates = strictSkillPool(
    grade,
    repairTarget + consolidateTarget,
    seed ^ 0x2468ace0,
    plan.focusSkills,
  );

  const repair = takeItems(
    [...nodeCandidates, ...skillCandidates],
    repairTarget,
    seen,
    "repair",
  );

  const consolidateSkills = plan.focusSkills.length
    ? plan.focusSkills
    : [...new Set(repair.map((item) => item.skillId))];
  const consolidate = takeItems(
    strictSkillPool(
      grade,
      consolidateTarget,
      seed ^ 0x51f15e,
      consolidateSkills,
    ),
    consolidateTarget,
    seen,
    "consolidate",
  );

  const missingFocused = Math.max(
    0,
    repairTarget + consolidateTarget - repair.length - consolidate.length,
  );
  const actualReviewTarget = reviewTarget + missingFocused;
  const reviewPool = generateArithmeticSet(
    grade,
    Math.max(24, actualReviewTarget * 4),
    seed ^ 0x9e3779b9,
    [],
    true,
    [],
  );
  const review = takeItems(reviewPool, actualReviewTarget, seen, "review");

  let items = seededShuffle(
    [...repair, ...consolidate, ...review],
    seed ^ 0x7f4a7c15,
  ).slice(0, count);

  if (items.length < count) {
    const fill = generateArithmeticSet(
      grade,
      count - items.length,
      seed ^ 0x6a09e667,
      [],
      false,
      [],
    ).map((item) => ({ ...item, printSource: "review" as const }));
    items = [...items, ...fill].slice(0, count);
  }

  return {
    items,
    mix: {
      repair: items.filter((x) => x.printSource === "repair").length,
      consolidate: items.filter((x) => x.printSource === "consolidate").length,
      review: items.filter((x) => x.printSource === "review").length,
    },
    personalized: true,
  };
}

export function makeArithmeticWorksheet(input: {
  grade: ArithmeticGrade;
  count: number;
  seed: number;
  index: number;
  mode: ArithmeticPrintMode;
  manualSkillId?: string;
  plan: TrainingPlan;
}): ArithmeticWorksheet {
  const { grade, count, seed, index, mode, manualSkillId, plan } = input;
  let generated: Pick<ArithmeticWorksheet, "items" | "mix" | "personalized">;

  if (mode === "smart") {
    generated = smartItems(grade, count, seed, plan);
  } else if (mode === "manual" && manualSkillId) {
    const seen = new Set<string>();
    const items = takeItems(
      strictSkillPool(grade, count, seed, [manualSkillId]),
      count,
      seen,
      "manual",
    );
    generated = {
      items,
      mix: { repair: 0, consolidate: 0, review: 0 },
      personalized: false,
    };
  } else {
    const items = generateArithmeticSet(grade, count, seed, [], false, []).map((item) => ({
      ...item,
      printSource: "mixed" as const,
    }));
    generated = {
      items,
      mix: { repair: 0, consolidate: 0, review: 0 },
      personalized: false,
    };
  }

  const code = `G${grade}-${Math.abs(seed).toString(36).toUpperCase()}-${String(index + 1).padStart(2, "0")}`;
  return { index, seed, code, ...generated };
}