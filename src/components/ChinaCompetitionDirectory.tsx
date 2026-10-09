"use client";
import { useState } from "react";
import CompetitionCompanion from "./CompetitionCompanion";
import { CHINA_MATH_COMPANIONS } from "@/lib/china-math-companion";
import { CHINA_MATH_EVENTS, NATIONAL_LIST_URL } from "@/lib/china-math-competitions";
import type { CompanionLang } from "@/lib/competition-companion";

/**
 * An event can exist in the training directory even without a verified
 * registration session. No exams, timers or signup routes are invented.
 */
export default function ChinaCompetitionDirectory({ lang, today }: { lang: CompanionLang; today: string }) {
  const [selected, setSelected] = useState(CHINA_MATH_EVENTS[0].id);
  const event = CHINA_MATH_EVENTS.find(e => e.id === selected) ?? CHINA_MATH_EVENTS[0];
  const companion = CHINA_MATH_COMPANIONS.find(c => c.id === event.companionId);
  const zh = lang === "zh";

  return <section id="china-math-companion" aria-label={zh ? "中国数学竞赛管家" : "China mathematics competitions"} style={{ marginTop: 40, marginBottom: 42 }}>
    <div className="section-heading">
      <div>
        <span className="eyebrow">CHINA MATHEMATICS · COMPETITION COMPANION</span>
        <h2>{zh ? "中国数学赛事管家" : "China mathematics competition companion"}</h2>
        <p>{zh
          ? "国内名赛、历史杯赛和高中数学奥赛统一查阅。先核验本届参赛资格，再制定备赛、设备调试、赴考和成绩归档清单。"
          : "Explore historical cups and the official high-school olympiad pathway. Verify each season before registration."}</p>
        <p>{zh
          ? "没有核实过的报名日期不会显示倒计时；历史试题和训练规划不等于当年开放报名。"
          : "Unverified dates never become registration countdowns; historical preparation does not imply an active event."}</p>
      </div>
    </div>
    <div className="feature-grid" aria-label={zh ? "国内赛事目录" : "China event directory"}>
      {CHINA_MATH_EVENTS.map(row => <article key={row.id} style={{ border: selected === row.id ? "2px solid currentColor" : undefined }}>
        <span className="eyebrow">{row.status === "national-list" ? (zh ? "教育部名单内" : "MOE listed") : (zh ? "赛事资料与备赛" : "Historical and preparation")}</span>
        <h3>{zh ? row.nameZh : row.nameEn}</h3>
        <p>{zh ? row.audienceZh : row.audienceEn}</p>
        <p><b>{zh ? row.statusZh : row.statusEn}</b></p>
        <button type="button" className={selected === row.id ? "primary-button" : "secondary-button"} aria-pressed={selected === row.id} onClick={() => setSelected(row.id)}>
          {selected === row.id ? (zh ? "正在查看 ✓" : "Selected ✓") : (zh ? "查看流程与准备" : "Open preparation guide")}
        </button>
      </article>)}
    </div>
    <div aria-live="polite" style={{ marginTop: 22 }}>
      <h3>{zh ? event.nameZh : event.nameEn}</h3>
      <p>{zh ? event.overviewZh : event.overviewEn}</p>
      <p><b>{zh ? "参赛方式：" : "Format: "}</b>{zh ? event.formatZh : event.formatEn}</p>
      <p><a href={event.sourceUrl} target="_blank" rel="noreferrer">{zh ? event.sourceLabelZh : event.sourceLabelEn} ↗</a> · {zh ? "核验" : "Checked"} {event.verifiedOn}</p>
      {event.status !== "national-list" && <p>{zh
        ? "提示：未列入当前教育部全国性竞赛名单，不意味着历史资料不能学习；也不应将名称相似的非内地活动当作内地正式赛事。"
        : "Not on the current MOE national list. Historical learning materials remain useful, but regional events are not interchangeable."}</p>}
      {companion && <CompetitionCompanion key={companion.id} companion={companion} lang={lang} today={today}/>}
    </div>
    <p style={{ marginTop: 16 }}>
      <a href={NATIONAL_LIST_URL} target="_blank" rel="noreferrer">
        {zh ? "教育部2025—2028全国性中小学生竞赛名单与管理政策 ↗" : "MOE 2025–2028 approved competitions ↗"}
      </a>
    </p>
  </section>;
}
