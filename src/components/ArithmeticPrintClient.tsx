"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GRADE_PROFILES, type ArithmeticGrade } from "@/lib/arithmetic";
import { generateArithmeticSet, type ArithmeticItem } from "@/lib/arithmetic-generator";

const QUESTION_OPTIONS = [20, 30, 40, 50, 60, 80] as const;
const SHEET_OPTIONS = [1, 2, 3, 5, 10, 15, 20] as const;

type Worksheet = {
  index: number;
  seed: number;
  code: string;
  items: ArithmeticItem[];
};

function printablePrompt(prompt: string) {
  return prompt
    .replace(/□/g, "______")
    .replace(/\?（填小数）/g, "______（填小数）")
    .replace(/\?/g, "______");
}

function makeWorksheet(
  grade: ArithmeticGrade,
  count: number,
  seed: number,
  focusSkills: string[],
  index: number,
): Worksheet {
  const output: ArithmeticItem[] = [];
  const seen = new Set<string>();
  let round = 0;

  while (output.length < count && round < 12) {
    const candidates = generateArithmeticSet(
      grade,
      Math.max(count, 24),
      seed + round * 104729,
      focusSkills,
      false,
      [],
    );
    for (const item of candidates) {
      if (focusSkills.length > 0 && !focusSkills.includes(item.skillId)) continue;
      if (!seen.has(item.prompt)) {
        seen.add(item.prompt);
        output.push(item);
        if (output.length === count) break;
      }
    }
    round += 1;
  }

  let fillRound = 0;
  while (output.length < count && fillRound < 50) {
    const fill = generateArithmeticSet(
      grade,
      Math.max(count, 24),
      (seed ^ 0x5f3759df) + fillRound * 65537,
      focusSkills,
      false,
      [],
    ).filter((item) => focusSkills.length === 0 || focusSkills.includes(item.skillId));
    for (const item of fill) {
      output.push(item);
      if (output.length === count) break;
    }
    fillRound += 1;
  }

  const code = `G${grade}-${Math.abs(seed).toString(36).toUpperCase()}-${String(index + 1).padStart(2, "0")}`;
  return { index, seed, code, items: output.slice(0, count) };
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
}: {
  initialGrade: ArithmeticGrade;
  initialSeed: number;
  studentName: string;
}) {
  const [grade, setGrade] = useState<ArithmeticGrade>(initialGrade);
  const [skillId, setSkillId] = useState("mixed");
  const [questions, setQuestions] = useState<number>(initialGrade <= 2 ? 40 : 60);
  const [sheetCount, setSheetCount] = useState<number>(5);
  const [answers, setAnswers] = useState(true);
  const [seed, setSeed] = useState(initialSeed);

  const profile = GRADE_PROFILES[grade];
  const activeSkill = profile.skills.find((x) => x.id === skillId);
  const focusKey = activeSkill?.id ?? "";

  const worksheets = useMemo(() => {
    const focusSkills = focusKey ? [focusKey] : [];
    return Array.from({ length: sheetCount }, (_, index) =>
      makeWorksheet(grade, questions, seed + index * 10007, focusSkills, index),
    );
  }, [grade, questions, sheetCount, seed, focusKey]);

  const totalQuestions = questions * sheetCount;
  const estimatedMinutes = Math.max(
    1,
    Math.round((questions * profile.targetMedianMs) / 60000),
  );

  function changeGrade(next: ArithmeticGrade) {
    setGrade(next);
    setSkillId("mixed");
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
              直接复用在线口算的年级规则和题目生成器。一次生成多张不同练习卷，最后可附答案页。
            </p>
          </div>
          <Link className="secondary-button" href="/arithmetic">
            返回口算中心
          </Link>
        </div>

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
            <span>训练内容</span>
            <select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
              <option value="mixed">综合训练（按年级权重）</option>
              {profile.skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  专项 · {skill.labelZh}
                </option>
              ))}
            </select>
          </label>

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
            <strong>{activeSkill?.labelZh ?? "综合训练"}</strong>
            <span>训练内容</span>
          </div>
          <div>
            <strong>约 {estimatedMinutes} 分</strong>
            <span>单张建议时间</span>
          </div>
        </section>

        <div className="print-toolbar">
          <button className="secondary-button" type="button" onClick={() => setSeed(Date.now())}>
            ↻ 换一批题
          </button>
          <button className="primary-button" type="button" onClick={() => window.print()}>
            打印 / 另存为 PDF
          </button>
        </div>

        <p className="print-note">
          打印预览中请选择 A4、纵向、缩放 100%。练习编号可以用来区分不同批次。
        </p>
      </div>

      <div className="print-pages" aria-label="A4 口算练习卷预览">
        {worksheets.map((sheet) => (
          <section className="a4-sheet exercise-sheet" key={sheet.code}>
            <header className="paper-header">
              <div>
                <span>袋鼠数学 · 纸笔口算</span>
                <h2>{profile.titleZh} · {activeSkill?.labelZh ?? "综合训练"}</h2>
              </div>
              <small>{sheet.code}</small>
            </header>

            <div className="paper-meta">
              <span>姓名：<b>{studentName || "________"}</b></span>
              <span>日期：________</span>
              <span>用时：____ 分 ____ 秒</span>
              <span>正确：____ / {questions}</span>
            </div>

            <div className={gridClass(questions)}>
              {sheet.items.map((item, idx) => (
                <div className="print-question" key={item.id}>
                  <b>{idx + 1}.</b>
                  <span>{printablePrompt(item.prompt)}</span>
                </div>
              ))}
            </div>

            <footer className="paper-footer">
              <span>建议：先独立完成，再对答案；错题请圈出来，不要立即擦掉。</span>
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
                  <h2>答案 · {profile.titleZh} · {activeSkill?.labelZh ?? "综合训练"}</h2>
                </div>
                <small>{sheet.code}</small>
              </header>

              <div className="answer-warning">答案页建议与练习卷分开装订或打印。</div>
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