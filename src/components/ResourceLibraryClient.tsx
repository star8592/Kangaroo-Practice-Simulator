"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSiteLanguage } from "@/lib/site-language";
import {
  filterTrainingResources, type ResourceListing,
} from "@/lib/resource-catalog";
import { availableResourceHubs, resourceHubPath } from "@/lib/seo-resource-hubs";
import styles from "@/app/resources/resources.module.css";

const PAGE_SIZE = 18;
const TYPE_LABELS = {
  zh: { past: "历年试卷", sample: "样题", smart: "智能组卷", practice: "练习卷", unspecified: "训练卷" },
  en: { past: "Past paper", sample: "Sample", smart: "Generated paper", practice: "Practice", unspecified: "Training paper" },
} as const;
const COPY = {
  zh: {
    heading: "查找试卷，直接练习",
    intro: "按竞赛、年级、类型筛选可练习的试卷。",
    search: "搜索竞赛、年份或试卷名称",
    competition: "全部竞赛", grade: "全部年级", type: "全部类型",
    all: "全部", total: "可用训练卷", matched: "符合条件", questions: "题",
    untimed: "不限时", min: "分钟", start: "进入在线练习", more: "查看更多",
    empty: "没有找到匹配的试卷。试试换一个年级或清除搜索条件。",
    reset: "清除条件",
    legal: "训练可用不代表具备商业转载或销售授权；本站目前不会将这些试卷擅自作为付费下载商品。考试访问权限仍由原有服务端规则决定。",
    back: "返回全部测评",
  },
  en: {
    heading: "Find a paper you can actually practise",
    intro: "Filter available papers by contest, grade and type.",
    search: "Search competition, year or title",
    competition: "All competitions", grade: "All grades", type: "All types",
    all: "All", total: "Training-ready papers", matched: "Matching", questions: "questions",
    untimed: "Untimed", min: "min", start: "Open practice exam", more: "Load more",
    empty: "No matching papers. Try another grade or clear your filters.",
    reset: "Clear filters",
    legal: "Training readiness is not a commercial-use or redistribution license. These papers are not offered for unauthorized paid downloads. Existing server-side access rules still apply.",
    back: "Back to assessments",
  },
} as const;

export default function ResourceLibraryClient({ resources }: { resources: ResourceListing[] }) {
  const lang = useSiteLanguage();
  const t = COPY[lang];
  const hubs = useMemo(() => availableResourceHubs(resources), [resources]);
  const [query, setQuery] = useState("");
  const [competition, setCompetition] = useState("");
  const [gradeBand, setGradeBand] = useState("");
  const [paperType, setPaperType] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const competitions = useMemo(() =>
    [...new Map(resources.map(row => [row.competition, row.competitionZh])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [resources]);
  const gradeBands = ["1-2", "3-4", "5-6", "7-8", "9-10", "11+"]
    .filter(band => resources.some(row => row.gradeBand === band));
  const filtered = useMemo(() => filterTrainingResources(resources, {
    query, competition, gradeBand, paperType: paperType as ResourceListing["paperType"] | "",
  }), [resources, query, competition, gradeBand, paperType]);
  const shown = filtered.slice(0, limit);
  const reset = () => {
    setQuery(""); setCompetition(""); setGradeBand(""); setPaperType(""); setLimit(PAGE_SIZE);
  };
  return <div data-site-shell="content" className={styles.page}>
    <header className={styles.hero}>
      <h1>{t.heading}</h1>
      <p>{t.intro}</p>
      <div className={styles.stats}>
        <span><strong>{resources.length}</strong> {t.total}</span>
        <span><strong aria-live="polite">{filtered.length}</strong> {t.matched}</span>
      </div>
    </header>
    <aside className={styles.shopCrosslink} aria-label={lang==="zh"?"原创资料商城":"Original resource shop"}>
      <div><strong>{lang==="zh"?"需要可以下载的原创 PDF？":"Looking for downloadable original PDFs?"}</strong>
      <p>{lang==="zh"?"这里以在线练习为主。完整原创数字资料请到独立商城查看真实文件、价格和当前付款状态。":"This page focuses on online practice. The separate shop shows actual original files, prices and live checkout status."}</p></div>
      <Link href="/shop">{lang==="zh"?"进入原创资料商城":"Open digital resource shop"} <span aria-hidden="true">→</span></Link>
    </aside>
    <section aria-label={lang === "zh" ? "试卷搜索筛选" : "Paper search filters"}
      className={styles.searchPanel}>
      <label className={styles.query}>
        <span>{t.search}</span>
        <input type="search" value={query} placeholder={t.search}
          onChange={event => {setQuery(event.target.value); setLimit(PAGE_SIZE);}} />
      </label>
      <div className={styles.filters}>
        <label><span>{t.competition}</span><select value={competition}
          onChange={event => {setCompetition(event.target.value); setLimit(PAGE_SIZE);}}>
          <option value="">{t.competition}</option>
          {competitions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
        </select></label>
        <label><span>{t.grade}</span><select value={gradeBand}
          onChange={event => {setGradeBand(event.target.value); setLimit(PAGE_SIZE);}}>
          <option value="">{t.grade}</option>
          {gradeBands.map(band => <option key={band} value={band}>{band}</option>)}
        </select></label>
        <label><span>{t.type}</span><select value={paperType}
          onChange={event => {setPaperType(event.target.value); setLimit(PAGE_SIZE);}}>
          <option value="">{t.type}</option>
          {Object.entries(TYPE_LABELS[lang]).map(([id, label]) =>
            <option value={id} key={id}>{label}</option>)}
        </select></label>
      </div>
      <button type="button" className={styles.reset} onClick={reset}>{t.reset}</button>
    </section>
    {shown.length ? <section className={styles.grid} aria-live="polite">
      {shown.map(row => <article className={styles.card} key={row.id}>
        <div className={styles.cardTop}>
          <span className={styles.competition}>{row.competitionZh}</span>
          <span className={styles.kind}>{TYPE_LABELS[lang][row.paperType]}</span>
        </div>
        <h2>{lang === "zh" ? row.titleZh : row.titleEn}</h2>
        <p className={styles.meta}>
          {[row.year,lang === "zh" ? row.gradeZh : row.gradeEn,
            `${row.questionCount} ${t.questions}`,
            row.durationMinutes ? `${row.durationMinutes} ${t.min}` : t.untimed]
            .filter(Boolean).join(" · ")}
        </p>
        <Link href={row.examUrl} className={styles.open}>{t.start}<span aria-hidden="true"> →</span></Link>
      </article>)}
    </section> : <p className={styles.empty}>{t.empty}</p>}
    {filtered.length > shown.length && <div className={styles.more}>
      <button type="button" onClick={() => setLimit(current => current + PAGE_SIZE)}>{t.more}</button>
    </div>}
    {hubs.length > 0 && <details className={styles.hubNav} aria-label={lang === "zh" ? "按竞赛浏览试卷专题" : "Competition resource guides"}>
      <summary className={styles.hubNavTitle}>{lang === "zh" ? "更多竞赛资料专题" : "More competition guides"}</summary>
      <div className={styles.hubLinks}>{hubs.map(hub =>
        <Link href={resourceHubPath(hub)} key={hub.id}>{hub.name}</Link>
      )}</div>
    </details>}
    <footer className={styles.footer}>
      <details><summary>{lang === "zh" ? "资料与授权说明" : "Rights and usage"}</summary><p>{t.legal}</p></details>
      <Link href="/assessments">{t.back}</Link>
    </footer>
  </div>;
}
