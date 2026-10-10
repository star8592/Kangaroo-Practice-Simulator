"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { WorldCompetition } from "@/lib/world-competitions";
import { WORLD_REGION_OPTIONS, WORLD_STAGE_OPTIONS, matchesWorldReferenceStage, worldRegionName } from "@/lib/world-competitions";
import { useSiteLanguage } from "@/lib/site-language";
import styles from "./WorldEventsExplorer.module.css";

type Stage = "all" | "primary" | "junior" | "senior";

export default function WorldEventsExplorer({events}: {events: WorldCompetition[]}) {
  const lang = useSiteLanguage();
  const [region, setRegion] = useState<string>("all");
  const [stage, setStage] = useState<Stage>("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return events.filter(event =>
      (region === "all" || event.region === region) &&
      matchesWorldReferenceStage(event, stage) &&
      (!term || [event.nameZh, event.nameEn, event.summaryZh, event.summaryEn]
        .some(value => value.toLocaleLowerCase().includes(term)))
    );
  }, [events, region, stage, search]);

  return <div className={styles.shell}>
    <header className={styles.hero}>
      <div className={styles.kicker}>SOC THINK · WORLD COMPETITIONS</div>
      <h1>{lang === "zh" ? "全球数学赛事管家" : "Worldwide mathematics competitions"}</h1>
      <p>{lang === "zh" ? "中国与国际数学赛事平等展示。先发现适合自己的比赛，再核实当届资格、规划备赛。" : "Explore competitions across regions, verify each edition's eligibility, and plan your preparation."}</p>
      <div className={styles.actions}>
        <Link href="/competitions" className={styles.primary}>{lang === "zh" ? "进入竞赛模拟" : "Start a mock exam"}</Link>
        <Link href="/arithmetic" className={styles.secondary}>{lang === "zh" ? "开始计算训练" : "Practice math"}</Link>
      </div>
    </header>
    <section aria-label={lang === "zh" ? "查找数学赛事" : "Find a competition"} className={styles.filters}>
      <label>
        <span>{lang === "zh" ? "搜索赛事" : "Search"}</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={lang === "zh" ? "例如：华杯赛、袋鼠、AMC、Gauss" : "Competition name"}
          type="search" />
      </label>
      <label>
        <span>{lang === "zh" ? "地区" : "Region"}</span>
        <select value={region} onChange={e => setRegion(e.target.value)}>
          {WORLD_REGION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option[lang]}</option>)}
        </select>
      </label>
      <label>
        <span>{lang === "zh" ? "参考学段" : "Reference stage"}</span>
        <select value={stage} onChange={e => setStage(e.target.value as Stage)}>
          {WORLD_STAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option[lang]}</option>)}
        </select>
      </label>
    </section>
    <div className={styles.summary} role="status">
      {lang === "zh" ? `找到 ${filtered.length} 项赛事 · 参考学段不代表当届报名资格` : `${filtered.length} competitions · Stage ranges are informational, not eligibility confirmation`}
    </div>
    <section className={styles.grid} aria-label={lang === "zh" ? "赛事列表" : "Competition list"}>
      {filtered.map(event => <article key={event.id} className={styles.card}>
        <div className={styles.meta}>
          <span>{worldRegionName(event.region, lang)}</span>
          <span>{lang === "zh" ? "当届报名及日期须核验" : "Verify current entry and dates"}</span>
        </div>
        <h2>{lang === "zh" ? event.nameZh : event.nameEn}</h2>
        <p>{lang === "zh" ? event.summaryZh : event.summaryEn}</p>
        <div className={styles.links}>
          <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
            {lang === "zh" ? "查看赛事来源 ↗" : "Organizer / source ↗"}
          </a>
          {event.trainingId && <Link href={`/competitions?c=${encodeURIComponent(event.trainingId)}`}>
            {lang === "zh" ? "查看可用模拟 →" : "Browse mock exams →"}
          </Link>}
        </div>
      </article>)}
    </section>
    {filtered.length === 0 && <div className={styles.empty}>
      <p>{lang === "zh" ? "没有符合条件的赛事。可以清空关键词或切换地区与学段。" : "No matches. Try another region or stage."}</p>
      <button type="button" onClick={() => {setSearch("");setRegion("all");setStage("all");}}>{lang === "zh" ? "查看全部赛事" : "Show all"}</button>
    </div>}
    <p className={styles.disclaimer}>{lang === "zh"
      ? "本站提供赛事信息与备赛工具，不代表主办方授权报名。是否开放报名、考试日期、参赛资格及官方奖项，请以对应年份和赛区的正式通知为准；未核实的活动不得被视为已开放。"
      : "This independent directory is not an official registration service. Always verify current-year eligibility, regional entry rules and deadlines with the organizer."}</p>
  </div>;
}
