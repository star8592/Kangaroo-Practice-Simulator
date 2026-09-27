import type { PublicStudent } from "./auth";
import { loadExamAttempts, type ExamAttemptRecord, type QuestionBehavior } from "./attempt-store";
import { conceptLabel } from "./display";

export type DiagnosticConfidence = "高" | "中" | "探索性";
export type DiagnosticFindingKind = "strength" | "priority" | "watch";

export type DiagnosticReport = {
  meta: { reportId: string; reportVersion: string; engineVersion: string; generatedAt: number; submittedAt: number; attemptId: string };
  student: { name: string; candidateNo: string; grade: number; school?: string };
  exam: { id: string; name: string; country?: string; year?: number; grades: string; competitionId?: string; paperType?: string; questionCount: number; maxScore: number };
  summary: { score: number; maxScore: number; scorePct: number; correct: number; wrong: number; blank: number; accuracy: number; completion: number; elapsedSeconds: number; avgQuestionSeconds: number; medianQuestionSeconds: number; confidenceLabel: DiagnosticConfidence; confidenceText: string };
  skills: Array<{ name: string; rawName: string; count: number; correct: number; accuracy: number; avgSeconds: number; confidence: DiagnosticConfidence }>;
  difficulty: Array<{ label: string; count: number; correct: number; accuracy: number }>;
  phases: Array<{ label: string; count: number; correct: number; accuracy: number; avgSeconds: number }>;
  behavior: { answerChanges: number; changedQuestions: number; correctToWrong: number; wrongToCorrect: number; rushedWrong: number; stuckWrong: number; slowCorrect: number; tabAwayCount: number; unanswered: number };
  findings: Array<{ kind: DiagnosticFindingKind; title: string; evidence: string; action: string; confidence: DiagnosticConfidence }>;
  questions: Array<{ no: number; points: number; concept: string; result: "正确" | "错误" | "未作答"; selected: string | null; correctAnswer: string; dwellSeconds: number; firstAnswerSeconds: number | null; answerChanges: number; pattern: string }>;
  plan: Array<{ priority: 1 | 2 | 3; title: string; why: string; prescription: string; successCriterion: string }>;
  trend: Array<{ attemptId: string; submittedAt: number; scorePct: number; accuracy: number; examName: string }>;
  parentGuide: string[];
  benchmarkNote: string;
};

const pct = (x: number) => Math.round(x * 100);
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
function median(xs: number[]) { if (!xs.length) return 0; const a = [...xs].sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function confidenceFromCount(count: number): DiagnosticConfidence { if (count >= 8) return "高"; if (count >= 4) return "中"; return "探索性"; }
function examCompetitionKey(a: ExamAttemptRecord) { return a.profile.competitionId || a.profile.formatId || a.examId.split("-").slice(0, 2).join("-"); }
function questionPattern(q: QuestionBehavior, typicalMs: number) {
  if (q.correct === null) return "未作答";
  if (q.correct === false && q.answerHistory.slice(0, -1).includes(q.correctAnswer)) return "复查改错";
  if (q.correct === false && q.answerChanges >= 2) return "反复修改";
  if (q.correct === false && typicalMs > 0 && q.dwellMs < typicalMs * 0.45) return "快速失分";
  if (q.correct === false && typicalMs > 0 && q.dwellMs > typicalMs * 1.8) return "耗时失分";
  if (q.correct === false) return "知识/策略待复核";
  if (q.correct === true && typicalMs > 0 && q.dwellMs > typicalMs * 1.8) return "正确但偏慢";
  if (q.answerChanges > 0) return "复查后得分";
  return "稳定得分";
}

export function buildDiagnosticReport(user: PublicStudent, attemptId: string): DiagnosticReport | null {
  const attempts = loadExamAttempts(user.id, 500).sort((a, b) => a.submittedAt - b.submittedAt);
  const attempt = attempts.find(a => a.id === attemptId);
  if (!attempt) return null;

  const qs = attempt.questions;
  const answered = qs.filter(q => q.selected !== null);
  const correct = qs.filter(q => q.correct === true).length;
  const wrong = qs.filter(q => q.correct === false).length;
  const blank = qs.filter(q => q.correct === null).length;
  const dwell = answered.map(q => q.dwellMs).filter(x => x > 0);
  const typicalMs = median(dwell);
  const scorePct = attempt.grade.maxScore ? Math.max(0, Math.min(1, attempt.grade.score / attempt.grade.maxScore)) : 0;
  const accuracy = qs.length ? correct / qs.length : 0;
  const completion = qs.length ? (qs.length - blank) / qs.length : 0;

  const changed = qs.filter(q => q.answerChanges > 0);
  const correctToWrong = changed.filter(q => q.correct === false && q.answerHistory.slice(0, -1).includes(q.correctAnswer));
  const wrongToCorrect = changed.filter(q => q.correct === true && q.answerHistory.slice(0, -1).some(x => x !== q.correctAnswer));
  const rushedWrong = qs.filter(q => q.correct === false && q.dwellMs > 0 && typicalMs > 0 && q.dwellMs < typicalMs * 0.45);
  const stuckWrong = qs.filter(q => q.correct === false && typicalMs > 0 && q.dwellMs > typicalMs * 1.8);
  const slowCorrect = qs.filter(q => q.correct === true && typicalMs > 0 && q.dwellMs > typicalMs * 1.8);

  const byConcept = new Map<string, QuestionBehavior[]>();
  for (const q of qs) { const key = q.concept || "综合能力"; const rows = byConcept.get(key) || []; rows.push(q); byConcept.set(key, rows); }
  const skills = [...byConcept.entries()].map(([rawName, rows]) => ({
    name: conceptLabel(rawName === "official_original" ? "综合能力" : rawName, "zh"), rawName, count: rows.length,
    correct: rows.filter(x => x.correct === true).length,
    accuracy: rows.length ? rows.filter(x => x.correct === true).length / rows.length : 0,
    avgSeconds: mean(rows.map(x => x.dwellMs).filter(Boolean)) / 1000,
    confidence: confidenceFromCount(rows.length),
  })).sort((a, b) => b.count - a.count || b.accuracy - a.accuracy);

  const difficulty = Object.entries(attempt.grade.byPosition || {}).length
    ? Object.entries(attempt.grade.byPosition || {}).map(([label, v]) => ({ label, count: v.total, correct: v.correct, accuracy: v.total ? v.correct / v.total : 0 }))
    : Object.entries(attempt.grade.byPoints).sort(([a], [b]) => Number(a) - Number(b)).map(([points, v]) => ({ label: `${points}分题`, count: v.total, correct: v.correct, accuracy: v.total ? v.correct / v.total : 0 }));

  const phase = (label: string, start: number, end: number) => {
    const rows = qs.filter((_, i) => { const r = (i + 1) / Math.max(1, qs.length); return r > start && r <= end; });
    return { label, count: rows.length, correct: rows.filter(x => x.correct === true).length, accuracy: rows.length ? rows.filter(x => x.correct === true).length / rows.length : 0, avgSeconds: mean(rows.map(x => x.dwellMs).filter(Boolean)) / 1000 };
  };
  const phases = [phase("前 1/3", 0, 1 / 3), phase("中 1/3", 1 / 3, 2 / 3), phase("后 1/3", 2 / 3, 1)];

  const findings: DiagnosticReport["findings"] = [];
  const meaningfulSkills = skills.filter(s => s.rawName !== "official_original" && s.count >= 3);
  const strongest = [...meaningfulSkills].sort((a, b) => b.accuracy - a.accuracy || b.count - a.count)[0];
  const weakest = [...meaningfulSkills].sort((a, b) => a.accuracy - b.accuracy || b.count - a.count)[0];

  if (strongest && strongest.accuracy >= .75) findings.push({ kind: "strength", title: `${strongest.name}是本次相对稳定的得分区`, evidence: `相关 ${strongest.count} 题答对 ${strongest.correct} 题，正确率 ${pct(strongest.accuracy)}%，平均用时 ${strongest.avgSeconds.toFixed(1)} 秒。`, action: "继续用少量跨题型复测保持迁移，不建议在已经稳定的基础题上堆重复题量。", confidence: strongest.confidence });
  if (weakest && weakest.accuracy < .65) findings.push({ kind: "priority", title: `${weakest.name}是当前最值得优先复核的能力点`, evidence: `相关 ${weakest.count} 题答对 ${weakest.correct} 题，正确率 ${pct(weakest.accuracy)}%。`, action: "先做同结构短组训练，要求口述或写出关键关系，再回到完整卷验证是否真正迁移。", confidence: weakest.confidence });
  if (blank > 0) findings.push({ kind: blank / Math.max(1, qs.length) >= .08 ? "priority" : "watch", title: "仍有可回收的未作答分数", evidence: `本次有 ${blank} 题未作答，占整卷 ${pct(blank / Math.max(1, qs.length))}%。`, action: "采用两遍法：第一遍快速拿下确定题，超过个人阈值先标记，末段统一回收未作答题。", confidence: "高" });
  if (rushedWrong.length >= 2) findings.push({ kind: "priority", title: "出现快速失分信号", evidence: `${rushedWrong.length} 道错题的有效停留时间低于个人本卷典型用时的 45%。`, action: "对低中难度题增加一次结构检查：问什么、已知什么、单位/方向是否看全，再提交答案。", confidence: rushedWrong.length >= 3 ? "高" : "中" });
  if (stuckWrong.length >= 2) findings.push({ kind: "priority", title: "部分题投入过久但没有转化为得分", evidence: `${stuckWrong.length} 道错题用时超过个人本卷中位用时的 1.8 倍。`, action: "建立个人跳题阈值。难题先标记并离开，避免单题吞掉后续可得分题的时间。", confidence: stuckWrong.length >= 3 ? "高" : "中" });
  if (changed.length >= 3 && correctToWrong.length > wrongToCorrect.length) findings.push({ kind: "priority", title: "本次复查修改的净收益为负", evidence: `改错→改对 ${wrongToCorrect.length} 题，改对→改错 ${correctToWrong.length} 题。`, action: "复查时只有找到明确的新证据才改答案，避免因不确定感做无依据修改。", confidence: changed.length >= 5 ? "高" : "中" });
  else if (changed.length >= 3 && wrongToCorrect.length > correctToWrong.length) findings.push({ kind: "strength", title: "复查策略本次带来了净增益", evidence: `改错→改对 ${wrongToCorrect.length} 题，高于改对→改错 ${correctToWrong.length} 题。`, action: "保留标记复查习惯，并继续记录哪些题型最值得二次检查。", confidence: changed.length >= 5 ? "高" : "中" });
  if (phases[0].count >= 4 && phases[2].count >= 4 && phases[0].accuracy - phases[2].accuracy >= .18) findings.push({ kind: "watch", title: "后程正确率出现明显回落", evidence: `前 1/3 正确率 ${pct(phases[0].accuracy)}%，后 1/3 为 ${pct(phases[2].accuracy)}%。`, action: "下一套卷重点验证是否由难度上升、时间分配或疲劳造成；不要仅凭一次考试给出性格化结论。", confidence: "中" });
  if (!findings.length) findings.push({ kind: "watch", title: "本次未发现足够稳定的单一错误模式", evidence: `当前样本为 ${qs.length} 题；多个指标没有达到稳定诊断阈值。`, action: "保留本次作为基线，完成下一套同赛制计时卷后再做跨卷比较。", confidence: "探索性" });

  const priorityFindings = findings.filter(x => x.kind === "priority");
  const plan: DiagnosticReport["plan"] = [];
  function addPlan(title: string, why: string, prescription: string, successCriterion: string) { if (plan.length >= 3) return; plan.push({ priority: (plan.length + 1) as 1 | 2 | 3, title, why, prescription, successCriterion }); }
  for (const f of priorityFindings) addPlan(f.title, f.evidence, f.action, "在下一次同赛制测评中，对应错误模式减少，并且不以其他题型正确率下降为代价。");
  if (weakest && plan.length < 3) addPlan(`修复 ${weakest.name} 的结构识别`, `${weakest.correct}/${weakest.count}，当前正确率 ${pct(weakest.accuracy)}%。`, "安排 2 组 × 6–8 题同结构变式；每题先写关键关系或画简图，再计算。第二组必须换表述方式，避免只记题型外观。", "连续两组正确率 ≥80%，且平均用时不高于本次同类题的 110%。");
  if (plan.length < 3 && slowCorrect.length >= 2) addPlan("把“会做但慢”转化为稳定得分", `${slowCorrect.length} 道正确题用时超过个人本卷中位用时的 1.8 倍。`, "从这些题中抽取 4–6 道同构题做限时短组，先保持正确，再逐步收紧单题时间。", "正确率保持 ≥85%，同时同类题中位用时下降。");
  if (plan.length < 3) addPlan("完成一次同赛制复测", "单次考试可以发现信号，但不足以证明这些信号已经稳定存在。", "7–14 天内完成一套同赛制、不同年份或不同题目的完整计时卷；尽量保持相同设备与环境。", "至少有 2 次独立测评支持同一结论后，再把它视为稳定能力特征。");
  if (plan.length < 3) addPlan("复盘本次高价值错题", `本次共有 ${wrong + blank} 道未得分题。`, "只挑 3–5 道最能代表错误模式的题复盘：写出“我当时怎么想—哪里转错—下次看到什么信号要换策略”。", "一周后遮住答案重做，能独立完成并解释关键步骤。");

  const currentIndex = attempts.findIndex(a => a.id === attempt.id);
  const history = attempts.slice(0, currentIndex + 1).filter(a => examCompetitionKey(a) === examCompetitionKey(attempt)).slice(-6);
  const trend = history.map(a => ({ attemptId: a.id, submittedAt: a.submittedAt, scorePct: a.grade.maxScore ? Math.max(0, Math.min(1, a.grade.score / a.grade.maxScore)) : 0, accuracy: a.questions.length ? a.questions.filter(q => q.correct === true).length / a.questions.length : 0, examName: a.profile.name }));

  const confidenceLabel: DiagnosticConfidence = qs.length >= 20 && attempts.length >= 3 ? "高" : qs.length >= 15 ? "中" : "探索性";
  const confidenceText = confidenceLabel === "高" ? `本次 ${qs.length} 题，并结合该账号 ${attempts.length} 次正式测评记录；可用于形成阶段性判断。` : confidenceLabel === "中" ? `本次 ${qs.length} 题足以识别明显信号，但部分能力维度仍需下一次同赛制测评复核。` : "当前样本较少，本报告更适合作为基线，不宜把单次波动解释为稳定能力特征。";

  return {
    meta: { reportId: `RPT-${attempt.id.replace(/^att_/, "").slice(0, 12).toUpperCase()}`, reportVersion: "1.0", engineVersion: "diagnostic-engine-1.0.0", generatedAt: Date.now(), submittedAt: attempt.submittedAt, attemptId: attempt.id },
    student: { name: user.name, candidateNo: user.candidateNo, grade: user.grade, school: user.school },
    exam: { id: attempt.examId, name: attempt.profile.name, country: attempt.profile.country, year: attempt.profile.year, grades: attempt.profile.grades, competitionId: attempt.profile.competitionId, paperType: attempt.profile.paperType, questionCount: attempt.profile.questionCount, maxScore: attempt.profile.maxScore },
    summary: { score: attempt.grade.score, maxScore: attempt.grade.maxScore, scorePct, correct, wrong, blank, accuracy, completion, elapsedSeconds: attempt.elapsedSeconds, avgQuestionSeconds: qs.length ? attempt.elapsedSeconds / qs.length : 0, medianQuestionSeconds: typicalMs / 1000, confidenceLabel, confidenceText },
    skills, difficulty, phases,
    behavior: { answerChanges: qs.reduce((n, q) => n + q.answerChanges, 0), changedQuestions: changed.length, correctToWrong: correctToWrong.length, wrongToCorrect: wrongToCorrect.length, rushedWrong: rushedWrong.length, stuckWrong: stuckWrong.length, slowCorrect: slowCorrect.length, tabAwayCount: qs.reduce((n, q) => n + q.tabAwayCount, 0), unanswered: blank },
    findings: findings.slice(0, 7),
    questions: qs.map(q => ({ no: q.questionNo, points: q.points, concept: conceptLabel(q.concept === "official_original" ? "综合能力" : q.concept, "zh"), result: q.correct === true ? "正确" : q.correct === false ? "错误" : "未作答", selected: q.selected, correctAnswer: q.correctAnswer, dwellSeconds: q.dwellMs / 1000, firstAnswerSeconds: q.firstAnswerMs === null ? null : q.firstAnswerMs / 1000, answerChanges: q.answerChanges, pattern: questionPattern(q, typicalMs) })),
    plan, trend,
    parentGuide: [`先讨论“哪三件事最值得改”，不要只围绕 ${Math.round(scorePct * 100)}% 的得分率评价孩子。`, "本轮只执行报告中的前三项训练处方；不要同时额外叠加大量机械刷题。", "复测时尽量保持相同计时规则和独立作答环境，才能判断改变来自能力提升还是测试条件变化。", "对“粗心、畏难、注意力差”等标签保持克制；报告只描述可观察行为，并要求跨测评重复出现后再升级结论。"],
    benchmarkNote: "本报告目前不生成未经验证的“全国排名/全国百分位”。如无官方常模或足够大的可审计参考样本，只使用学生自身历史表现、同一试卷内行为数据和题目结构证据。",
  };
}