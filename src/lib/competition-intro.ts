export type CompetitionIntroLang = "zh" | "en";

export type CompetitionIntroCopy = {
  badge: string;
  title: string;
  summary: string;
  facts: { label: string; value: string }[];
  strengths: string[];
  note: string;
};

export type CompetitionIntroId = "kangaroo" | "australian-amc" | "maa-amc" | "cemc";

export const COMPETITION_INTRO: Record<
  CompetitionIntroId,
  Record<CompetitionIntroLang, CompetitionIntroCopy>
> = {
  kangaroo: {
    zh: {
      badge: "INTERNATIONAL · KSF",
      title: "袋鼠数学 Math Kangaroo",
      summary:
        "面向中小学生的大众型国际数学思维竞赛。核心不是超前学习高年级知识，而是用短而巧的问题考查数感、观察、逻辑、空间想象与灵活解决问题的能力。不同国家和年级的题量、时长与计分可能不同，所以本站按真实赛区与组别分别保留赛制。",
      facts: [
        { label: "主办体系", value: "Association Kangourou sans Frontières（KSF）国际体系，各地区由合作机构组织" },
        { label: "适合学生", value: "小学到高中；尤其适合作为低龄学生进入数学竞赛与非套路问题解决的第一站" },
        { label: "常见形式", value: "选择题为主，难度逐段提升；常见3分、4分、5分梯度，但具体题量和评分必须以所在赛区当年规则为准" },
        { label: "本站处理", value: "不把各国袋鼠卷强行混成一种赛制；国家、年级、题量、时间与倒扣规则分别继承原卷" },
      ],
      strengths: ["数感与巧算", "图形与空间想象", "逻辑推理", "规律发现", "阅读与快速建模"],
      note: "袋鼠数学是国际体系而非全球完全统一的一张试卷；训练时应优先选择与你实际参赛地区和组别一致的赛制。",
    },
    en: {
      badge: "INTERNATIONAL · KSF",
      title: "Math Kangaroo",
      summary:
        "A broad international problem-solving competition for school students. Its short, inventive problems emphasize number sense, observation, logic, spatial reasoning and flexible thinking rather than simply learning more advanced curriculum earlier. Formats can vary by country and division, so this site preserves each source format separately.",
      facts: [
        { label: "Organizer", value: "Association Kangourou sans Frontières (KSF) network, delivered by regional partner organizations" },
        { label: "Who it suits", value: "Primary through secondary students; an accessible entry point into non-routine mathematical problem solving" },
        { label: "Typical format", value: "Mostly multiple choice with progressive difficulty; 3/4/5-point bands are common, while exact question count and scoring depend on the local competition" },
        { label: "On this site", value: "Country, division, timing, scoring and penalty rules stay attached to the original paper format" },
      ],
      strengths: ["Number sense", "Spatial reasoning", "Logic", "Pattern finding", "Fast mathematical modelling"],
      note: "Math Kangaroo is an international family of competitions rather than one globally identical paper. Train with the format used by your actual region and division.",
    },
  },
  "australian-amc": {
    zh: {
      badge: "AUSTRALIA · AMT",
      title: "澳大利亚数学竞赛 Australian AMC",
      summary:
        "Australian Maths Trust（AMT）的旗舰数学竞赛，1978年首次举行，面向小学到高中学生。题目从基础数学理解逐步走向较高水平的问题解决，强调在有限时间内把知识、推理与策略综合起来。",
      facts: [
        { label: "主办方", value: "Australian Maths Trust（AMT）" },
        { label: "适合年级", value: "澳大利亚 Years 3–12（海外按对应年级参加）" },
        { label: "正式赛制", value: "30题：前25题选择题，后5题为整数填答；小学组60分钟，中学组75分钟" },
        { label: "计分", value: "1–10题3分，11–20题4分，21–25题5分，26–30题依次6–10分；满分135分，答错不倒扣" },
      ],
      strengths: ["算术与数论基础", "比例与代数", "几何与测量", "统计与概率", "综合问题解决"],
      note: "本站把正式 AMC 与 Pre-A 等官方样题分开处理；样题用于适龄训练，不会伪装成正式历年卷。",
    },
    en: {
      badge: "AUSTRALIA · AMT",
      title: "Australian Mathematics Competition",
      summary:
        "The flagship mathematics competition of the Australian Maths Trust (AMT), first run in 1978. It spans primary through secondary school and progresses from accessible mathematics to increasingly demanding problem solving under time pressure.",
      facts: [
        { label: "Organizer", value: "Australian Maths Trust (AMT)" },
        { label: "Grades", value: "Australian Years 3–12 and overseas equivalents" },
        { label: "Official format", value: "30 questions: 25 multiple choice followed by 5 integer answers; 60 minutes for primary divisions and 75 minutes for secondary divisions" },
        { label: "Scoring", value: "Q1–10: 3 points, Q11–20: 4, Q21–25: 5, Q26–30: 6–10; 135 points total, no penalty for incorrect responses" },
      ],
      strengths: ["Arithmetic & number", "Ratios & algebra", "Geometry & measurement", "Statistics & probability", "Integrated problem solving"],
      note: "Official AMC papers and Pre-A/sample material are kept as distinct formats on this site.",
    },
  },
  "maa-amc": {
    zh: {
      badge: "UNITED STATES · MAA",
      title: "美国 AMC 系列 MAA American Mathematics Competitions",
      summary:
        "由 Mathematical Association of America（MAA）组织的美国数学竞赛体系。本站把 AMC 8、AMC 10、AMC 12 与 AIME 当作四个独立阶段，而不是简单按“年级卷”混在一起，因为它们的内容边界、时间、答题方式和后续路径都不同。",
      facts: [
        { label: "主办方", value: "Mathematical Association of America（MAA）；AMC 项目始于1950年" },
        { label: "AMC 8", value: "8年级及以下，25道选择题，40分钟；重点覆盖中学基础数学与非套路问题解决" },
        { label: "AMC 10 / 12", value: "分别面向10年级及以下、12年级及以下；均为25道选择题、75分钟；AMC 12范围更完整，仍不含微积分" },
        { label: "AIME", value: "由 AMC 10/12 的优秀成绩获得邀请；15道0–999整数答案题。2027年起采用两部分、每部分90分钟的考试结构" },
      ],
      strengths: ["代数与函数", "几何", "数论", "计数与概率", "多步推理与策略"],
      note: "典型学习路径是 AMC 8 → AMC 10/12 → AIME，并进一步衔接 USAJMO/USAMO。具体晋级线与年度政策会变化，本站训练页只采用对应年度的明确规则。",
    },
    en: {
      badge: "UNITED STATES · MAA",
      title: "MAA American Mathematics Competitions",
      summary:
        "The U.S. competition program organized by the Mathematical Association of America (MAA). AMC 8, AMC 10, AMC 12 and AIME are treated as separate stages here because their content limits, timing, answer formats and progression are materially different.",
      facts: [
        { label: "Organizer", value: "Mathematical Association of America (MAA); the AMC program dates to 1950" },
        { label: "AMC 8", value: "Grade 8 and below; 25 multiple-choice questions in 40 minutes" },
        { label: "AMC 10 / 12", value: "Grade 10 and below / Grade 12 and below; 25 multiple-choice questions in 75 minutes; AMC 12 covers the broader high-school curriculum but excludes calculus" },
        { label: "AIME", value: "Invitation follows qualifying AMC 10/12 performance; 15 integer answers from 000–999. From 2027 the exam is split into two 90-minute parts" },
      ],
      strengths: ["Algebra & functions", "Geometry", "Number theory", "Counting & probability", "Multi-step strategy"],
      note: "A common progression is AMC 8 → AMC 10/12 → AIME → USAJMO/USAMO. Qualification thresholds and annual policies can change, so year-specific official rules take precedence.",
    },
  },
  cemc: {
    zh: {
      badge: "CANADA · WATERLOO",
      title: "加拿大滑铁卢 CEMC 数学竞赛",
      summary:
        "由加拿大滑铁卢大学 Centre for Education in Mathematics and Computing（CEMC）组织的一整套分年级数学竞赛。它不是单一考试：Gauss、Pascal、Cayley、Fermat、Euclid 分别服务于不同年级与能力阶段，从选择题逐步过渡到需要完整书写推理过程的高阶题。",
      facts: [
        { label: "主办方", value: "University of Waterloo · Centre for Education in Mathematics and Computing（CEMC）" },
        { label: "Gauss", value: "主要面向7、8年级；25道选择题，60分钟，满分150分，后段更强调洞察与巧思" },
        { label: "Pascal / Cayley / Fermat", value: "主要对应9–11年级，保持选择题型与逐步提升难度，适合建立中学竞赛问题解决能力" },
        { label: "Euclid", value: "面向高中高年级的代表性赛事；10道大题，2.5小时，包含短答与需要展示过程的完整解答" },
      ],
      strengths: ["严谨推理", "代数与几何", "组合与数论", "表达数学过程", "由选择题向证明型思维过渡"],
      note: "CEMC 各子赛事差异很大，因此本站按 Gauss / Pascal / Cayley / Fermat / Euclid 分开建模，不用一个统一模板覆盖全部。",
    },
    en: {
      badge: "CANADA · WATERLOO",
      title: "University of Waterloo CEMC Contests",
      summary:
        "A family of school mathematics contests run by the University of Waterloo's Centre for Education in Mathematics and Computing (CEMC). Gauss, Pascal, Cayley, Fermat and Euclid serve different grade and ability levels, moving from multiple choice toward written mathematical solutions.",
      facts: [
        { label: "Organizer", value: "University of Waterloo · Centre for Education in Mathematics and Computing (CEMC)" },
        { label: "Gauss", value: "Primarily Grades 7–8; 25 multiple-choice questions, 60 minutes, score out of 150" },
        { label: "Pascal / Cayley / Fermat", value: "Primarily Grades 9–11, using progressively more demanding contest problem solving" },
        { label: "Euclid", value: "A senior secondary contest with 10 questions in 2.5 hours, combining short answers and full written solutions" },
      ],
      strengths: ["Rigorous reasoning", "Algebra & geometry", "Combinatorics & number", "Written mathematical communication", "Transition toward proof-style thinking"],
      note: "CEMC contests use materially different formats, so Gauss / Pascal / Cayley / Fermat / Euclid are modelled separately on this site.",
    },
  },
};
