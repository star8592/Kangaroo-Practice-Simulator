export type SolutionVisual =
  | { type: "source-image"; url: string }
  | { type: "number-line"; start: number; end: number; marker?: number }
  | { type: "fraction-bar"; numerator: number; denominator: number }
  | { type: "solid3d"; shape: "cube" }
  | { type: "none" };

export type SolutionScene = {
  id: string;
  title: string;
  narration: string;
  caption?: string;
  visual: SolutionVisual;
  checkpoint?: string;
  durationMs?: number;
  audioUrl?: string;
  audioDurationMs?: number;
  renderSpec?: { engine: "source"|"svg"|"jsxgraph"|"three"|"manim"; instruction?: string; script?: string[]; interaction?: string; voiceDirection?: string };
};

export type SolutionStoryboard = {
  version: 1;
  quality: "answer-only" | "heuristic" | "verified";
  requiresGeneration: boolean;
  scenes: SolutionScene[];
};

export type StoryboardInput = {
  stem: string;
  solution?: string;
  answer: string;
  concept?: string;
  assetUrl?: string;
};
function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function answerOnly(solution?: string) {
  const s = clean(solution || "");
  if (!s) return true;
  return /^(官方答案|official answer)\s*[:：/]/i.test(s) || s.length < 18;
}

function splitReasoning(solution?: string) {
  const s = clean(solution || "");
  if (!s || answerOnly(s)) return [];
  return s
    .split(/(?<=[。！？；;])\s*|\s*(?:=>|→|因此|所以)\s*/)
    .map(clean)
    .filter((x) => x.length >= 4)
    .slice(0, 5);
}

function detectVisual(input: StoryboardInput): SolutionVisual {
  const text = `${input.stem} ${input.solution || ""} ${input.concept || ""}`;
  if (/(正方体|立方体|cube)/i.test(text)) return { type: "solid3d", shape: "cube" };
  const frac = text.match(/(?:分数|fraction)[^0-9]{0,20}(\d+)\s*\/\s*(\d+)/i);
  if (frac) {
    const numerator = Number(frac[1]);
    const denominator = Number(frac[2]);
    if (denominator > 0 && denominator <= 20 && numerator <= denominator) {
      return { type: "fraction-bar", numerator, denominator };
    }
  }
  if (input.assetUrl) return { type: "source-image", url: input.assetUrl };
  return { type: "none" };
}
export function buildFallbackStoryboard(input: StoryboardInput): SolutionStoryboard {
  const reasoning = splitReasoning(input.solution);
  const visual = detectVisual(input);
  const weak = answerOnly(input.solution);
  const scenes: SolutionScene[] = [
    {
      id: "observe",
      title: "先当 5 秒数学侦探",
      narration: "先别急着算。我们先看看题目到底给了什么，又想让我们找什么。数学高手经常赢在这五秒。",
      caption: clean(input.stem),
      visual,
      checkpoint: "你能先说出“已知”和“要找什么”吗？",
      durationMs: 6500,
    },
  ];

  if (weak) {
    scenes.push({
      id: "needs-generation",
      title: "这题需要完整推导",
      narration: "题库现在只有官方答案，还没有经过验证的详细推导。这里先不瞎编，等智能解题流水线生成并通过复核后再给你动画解释。",
      caption: input.solution || "暂无可靠解析",
      visual,
      durationMs: 6500,
    });
  } else {
    reasoning.forEach((part, index) => scenes.push({
      id: `reason-${index + 1}`,
      title: index === 0 ? "把文字变成关系" : `第 ${index + 2} 步`,
      narration: part,
      caption: part,
      visual,
      durationMs: Math.max(5000, Math.min(9000, part.length * 130)),
    }));
  }
  scenes.push({
    id: "answer",
    title: "收网：答案出现",
    narration: weak
      ? `官方答案是 ${input.answer}。等完整推导生成后，我们会在这里补上为什么。`
      : `最后检查一次条件和计算，答案是 ${input.answer}。不是猜中的，是一步一步抓到的。`,
    caption: `答案：${input.answer}`,
    visual,
    durationMs: 5000,
  });

  return {
    version: 1,
    quality: weak ? "answer-only" : "heuristic",
    requiresGeneration: weak,
    scenes,
  };
}
