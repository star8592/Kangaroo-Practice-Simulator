"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CLEVER_NODE_GUIDE,
  GRADE_PROFILES,
  type ArithmeticGrade,
} from "@/lib/arithmetic";
import {
  buildTrainingPlan,
  type ArithmeticSession,
} from "@/lib/arithmetic-analytics";
import {
  makeArithmeticWorksheet,
  type ArithmeticPrintMode,
} from "@/lib/arithmetic-print";

const QUESTION_OPTIONS = [20, 30, 40, 50, 60, 80] as const;
const SHEET_OPTIONS = [1, 2, 3, 5, 10, 15, 20] as const;

function printablePrompt(prompt: string) {
  return prompt
    .replace(/□/g, "______")
    .replace(/\?（填小数）/g, "______（填小数）")
    .replace(/\?/g, "______");
}

function gridClass(count: number) {
  if (count <= 40) return "print-question-grid cols-2";
  if (count <= 60) return "print-question-grid cols-3";
  return "print-question-grid cols-4";
}

export default function ArithmeticPrintClient({
  initialGrade,
  initialSeed,
  studentName,
  sessions,
}: {
  initialGrade: ArithmeticGrade;
  initialSeed: number;
  studentName: string;
  sessions: ArithmeticSession[];
}) {
  const [grade, setGrade] = useState<ArithmeticGrade>(initialGrade);
  const [mode, setMode] = useState<ArithmeticPrintMode>("smart");
  const [manualSkillId, setManualSkillId] = useState(
    GRADE_PROFILES[initialGrade].skills[0]?.id ?? "",
  );
  const [questions, setQuestions] = useState<number>(initialGrade <= 2 ? 40 : 60);
  const [sheetCount, setSheetCount] = useState<number>(5);
  const [answers, setAnswers] = useState(true);
  const [seed, setSeed] = useState(initialSeed);

  const profile = GRADE_PROFILES[grade];
  const plan = useMemo(() => buildTrainingPlan(grade, sessions), [grade, sessions]);
  const evidenceQuestions = plan.metrics.reduce((sum, metric) => sum + metric.attempts, 0);
  const focusSkills = plan.focusSkills
    .map((id) => profile.skills.find((skill) => skill.id === id)?.labelZh)
    .filter((label): label is string => Boolean(label));
  const focusNodes = plan.focusNodes.map((node) => CLEVER_NODE_GUIDE[node].zh);
  const hasSmartFocus = focusSkills.length > 0 || focusNodes.length > 0;
  const manualSkill = profile.skills.find((skill) => skill.id === manualSkillId);

  const worksheets = useMemo(
    () =>
      Array.from({ length: sheetCount }, (_, index) =>
        makeArithmeticWorksheet({
          grade,
          count: questions,
          seed: seed + index * 10007,
          index,
          mode,
          manualSkillId: mode === "manual" ? manualSkillId : undefined,
          plan,
        }),
      ),
    [grade, questions, sheetCount, seed, mode, manualSkillId, plan],
  );

  const totalQuestions = questions * sheetCount;
  const estimatedMinutes = Math.max(
    1,
    Math.round((questions * profile.targetMedianMs) / 60000),
  );
  const firstMix = worksheets[0]?.mix ?? { repair: 0, consolidate: 0, review: 0 };

  const modeTitle =
    mode === "smart"
      ? hasSmartFocus
        ? "智能个性化"
        : "智能均衡巩固"
      : mode === "manual"
        ? `专项 · ${manualSkill?.labelZh ?? "请选择专项"}`
        : "年级综合训练";

  const paperPlan =
    mode === "smart"
      ? hasSmartFocus
        ? `智能个性化 · 本卷重点：${[...focusSkills, ...focusNodes].slice(0, 4).join(" · ")} · 配题 ${firstMix.repair}重点 + ${firstMix.consolidate}巩固 + ${firstMix.review}复习`
        : evidenceQuestions > 0
          ? `智能均衡巩固 · 最近 ${evidenceQuestions} 题没有形成稳定弱项，本卷不额外加权`
          : "智能模式 · 暂无该年级口算数据，本卷先按年级标准建立基础覆盖"
      : mode === "manual"
        ? `老师指定专项 · ${manualSkill?.labelZh ?? ""}`
        : "年级综合训练 · 按本年级技能权重配题";

  function changeGrade(next: ArithmeticGrade) {
    setGrade(next);
    setManualSkillId(GRADE_PROFILES[next].skills[0]?.id ?? "");
    setQuestions(next <= 2 ? 40 : 60);
    setSeed(Date.now());
  }

  return (
    <div className="print-workspace">
      <div className="print-screen-shell screen-only">
        <div className="print-screen-head">
          <div>
            <span className="eyebrow">PAPER PRACTICE</span>
            <h1>A4 口算批量打印</h1>
            <p>
              默认使用该学生自己的口算历史生成个性化纸笔训练；也可切换年级综合或老师指定专项。
            </p>
          </div>
          <Link className="secondary-button" href="/arithmetic">
            返回口算中心
          </Link>
        </div>

        <section className="personalized-print-card">
          <div>
            <span className="eyebrow">PERSONALIZED FOR</span>
            <h2>为 {studentName} 生成</h2>
          </div>
          {mode === "smart" ? (
            evidenceQuestions === 0 ? (
              <p>
                这个年级还没有口算行为数据。系统不会凭空制造“弱项”，本批先按年级标准均衡出题；完成在线诊断后再自动个性化。
              </p>
            ) : hasSmartFocus ? (
              <div className="personalized-copy">
                <p>
                  配题依据：最近 <b>{evidenceQuestions}</b> 题个人数据。默认每张约
                  <b> 60% 重点修复 + 25% 同技能巩固 + 15% 综合复习</b>。
                </p>
                <div className="personalized-chips">
                  {focusSkills.map((label) => (
                    <span key={`skill-${label}`}>重点技能 · {label}</span>
                  ))}
                  {focusNodes.map((label) => (
                    <span key={`node-${label}`}>巧算结构 · {label}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p>
                已分析最近 <b>{evidenceQuestions}</b> 题，目前没有足够证据判定稳定弱项。系统自动采用均衡巩固，不因为一次慢题或一次错误过度加练。
              </p>
            )
          ) : (
            <p>
              当前已关闭自动个性化。{mode === "manual" ? "本批严格只出老师指定专项。" : "本批按年级标准权重综合出题。"}
            </p>
          )}
        </section>

        <section className="print-config-card">
          <label>
            <span>年级</span>
            <select
              value={grade}
              onChange={(e) => changeGrade(Number(e.target.value) as ArithmeticGrade)}
            >
              {([1, 2, 3, 4, 5, 6] as ArithmeticGrade[]).map((g) => (
                <option key={g} value={g}>
                  {GRADE_PROFILES[g].titleZh}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>配题模式</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as ArithmeticPrintMode)}>
              <option value="smart">智能个性化（默认）</option>
              <option value="mixed">年级综合训练</option>
              <option value="manual">老师指定专项</option>
            </select>
          </label>

          {mode === "manual" && (
            <label>
              <span>专项内容</span>
              <select value={manualSkillId} onChange={(e) => setManualSkillId(e.target.value)}>
                {profile.skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.labelZh}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span>每张题量</span>
            <select value={questions} onChange={(e) => setQuestions(Number(e.target.value))}>
              {QUESTION_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} 题
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>生成张数</span>
            <select value={sheetCount} onChange={(e) => setSheetCount(Number(e.target.value))}>
              {SHEET_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} 张
                </option>
              ))}
            </select>
          </label>

          <label className="print-answer-toggle">
            <input
              type="checkbox"
              checked={answers}
              onChange={(e) => setAnswers(e.target.checked)}
            />
            <span>打印答案页</span>
          </label>
        </section>

        <section className="print-summary-card">
          <div>
            <strong>{sheetCount}</strong>
            <span>A4 练习卷</span>
          </div>
          <div>
            <strong>{totalQuestions}</strong>
            <span>总题量</span>
          </div>
          <div>
            <strong>{modeTitle}</strong>
            <span>当前配题方式</span>
          </div>
          <div>
            <strong>约 {estimatedMinutes} 分</strong>
            <span>单张建议时间</span>
          </div>
        </section>

        {mode === "smart" && hasSmartFocus && (
          <section className="print-mix-strip">
            <div>
              <b>{firstMix.repair}</b>
              <span>重点修复</span>
            </div>
            <div>
              <b>{firstMix.consolidate}</b>
              <span>同技能巩固</span>
            </div>
            <div>
              <b>{firstMix.review}</b>
              <span>综合复习</span>
            </div>
          </section>
        )}

        <div className="print-toolbar">
          <button className="secondary-button" type="button" onClick={() => setSeed(Date.now())}>
            ↻ 换一批题
          </button>
          <button className="primary-button" type="button" onClick={() => window.print()}>
            打印 / 另存为 PDF
          </button>
        </div>

        <p className="print-note">
          打印预览中请选择 A4、纵向、缩放 100%。同一练习编号可用于核对对应答案页。
        </p>
      </div>

      <div className="print-pages" aria-label="A4 口算练习卷预览">
        {worksheets.map((sheet) => (
          <section className="a4-sheet exercise-sheet" key={sheet.code}>
            <header className="paper-header">
              <div>
                <span>袋鼠数学 · 纸笔口算</span>
                <h2>{profile.titleZh} · {modeTitle}</h2>
              </div>
              <small>{sheet.code}</small>
            </header>

            <div className="paper-meta">
              <span>姓名：<b>{studentName || "________"}</b></span>
              <span>日期：________</span>
              <span>用时：____ 分 ____ 秒</span>
              <span>正确：____ / {questions}</span>
            </div>

            <div className="paper-plan">{paperPlan}</div>

            <div className={gridClass(questions)}>
              {sheet.items.map((item, idx) => (
                <div className="print-question" key={item.id}>
                  <b>{idx + 1}.</b>
                  <span>{printablePrompt(item.prompt)}</span>
                </div>
              ))}
            </div>

            <footer className="paper-footer">
              <span>先独立完成，再对答案；错题请圈出，保留原始过程。</span>
              <span>{sheet.index + 1} / {sheetCount}</span>
            </footer>
          </section>
        ))}

        {answers &&
          worksheets.map((sheet) => (
            <section className="a4-sheet answer-sheet" key={`answer-${sheet.code}`}>
              <header className="paper-header">
                <div>
                  <span>袋鼠数学 · 教师 / 家长核对页</span>
                  <h2>答案 · {profile.titleZh} · {modeTitle}</h2>
                </div>
                <small>{sheet.code}</small>
              </header>

              <div className="answer-warning">{paperPlan}</div>
              <div className="answer-grid">
                {sheet.items.map((item, idx) => (
                  <div key={item.id}>
                    <b>{idx + 1}.</b>
                    <span>{item.answer}</span>
                  </div>
                ))}
              </div>

              <footer className="paper-footer">
                <span>练习编号：{sheet.code}</span>
                <span>答案 {sheet.index + 1} / {sheetCount}</span>
              </footer>
            </section>
          ))}
      </div>
    </div>
  );
}
