import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import { buildTrainingResourceCatalog } from "@/lib/resource-catalog";
import { getResourceHub } from "@/lib/seo-resource-hubs";
import styles from "../../resources.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const getPageData = cache((slug: string) => {
  const hub = getResourceHub(slug);
  if (!hub) return null;
  const rows = buildTrainingResourceCatalog(listTrainingExamProfiles())
    .filter((row) => row.competition === hub.id);
  if (!rows.length) return null;
  return { hub, rows };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageData(slug);
  if (!page) return { robots: { index: false, follow: false } };
  return {
    title: page.hub.title + " | SOC THINK",
    description: page.hub.description,
    alternates: { canonical: "/resources/competitions/" + page.hub.id },
  };
}

const typeLabels: Record<string, string> = {
  past: "历年试卷（训练）",
  sample: "样题练习",
  smart: "平台智能组卷",
  practice: "练习卷",
  unspecified: "训练卷",
};

export default async function CompetitionResourceHub({ params }: Props) {
  const { slug } = await params;
  const page = getPageData(slug);
  if (!page) notFound();

  const { hub, rows } = page;
  const latestYears = Array.from(new Set(rows.map((item) => item.year).filter((year): year is number => year !== null)))
    .sort((a, b) => b - a).slice(0, 3);
  const recent = rows.filter((row) => row.year !== null && latestYears.includes(row.year));
  const selected = (recent.length ? recent : rows).slice(0, 18);

  return (
    <div data-site-shell="content" className={styles.page}>
      <nav aria-label="面包屑" className={styles.breadcrumbs}>
        <Link href="/">首页</Link><span aria-hidden="true"> / </span>
        <Link href="/resources">试卷资料</Link><span aria-hidden="true"> / </span>
        <span>{hub.name}</span>
      </nav>
      <header className={styles.hero}>
        <div className={styles.eyebrow}>SOC THINK / VERIFIED TRAINING CATALOGUE</div>
        <h1>{hub.title}</h1>
        <p>{hub.description}</p>
        <div className={styles.stats}>
          <span><strong>{rows.length}</strong> 个可用训练项目</span>
          <span>实际题量、年份与时长以各卷信息为准</span>
        </div>
      </header>

      <section className={styles.explainer} aria-labelledby="hub-about">
        <h2 id="hub-about">考试信息与官方参考</h2>
        <p>{hub.guide}</p>
        <p>
          <strong>原始信息来源：</strong>{" "}
          <a href={hub.officialUrl} rel="nofollow noopener noreferrer" target="_blank">
            {hub.officialName}
          </a>
        </p>
        <p className={styles.disclaimer}>
          官方规则资料仅用于了解竞赛，不代表本平台与主办方存在合作、官方认证或资料转售授权。
          下方是本站已可训练的目录元数据，不提供未经授权的原卷下载或答案公开。
        </p>
      </section>

      <section aria-labelledby="hub-papers">
        <h2 id="hub-papers" className={styles.sectionTitle}>当前可用训练卷</h2>
        <p className={styles.sectionIntro}>
          优先显示最近收录年份的训练项目；完整清单和年级筛选请前往{" "}
          <Link href="/resources">试卷资料检索</Link>。
        </p>
        <div className={styles.grid}>
          {selected.map((row) => (
            <article className={styles.card} key={row.id}>
              <div className={styles.cardTop}>
                <span className={styles.competition}>{hub.name}</span>
                <span className={styles.kind}>{typeLabels[row.paperType]}</span>
              </div>
              <h2>{row.titleZh}</h2>
              <p className={styles.meta}>
                {[
                  row.year ? String(row.year) + " 年" : null,
                  row.gradeZh,
                  String(row.questionCount) + " 题",
                  row.durationMinutes ? String(row.durationMinutes) + " 分钟" : "不限时或未标注时长",
                ].filter(Boolean).join(" · ")}
              </p>
              <Link href={row.examUrl} className={styles.open}>进入练习</Link>
            </article>
          ))}
        </div>
        <div className={styles.hubFooter}>
          <Link href="/resources">查看全部可用试卷及筛选条件</Link>
        </div>
      </section>
    </div>
  );
}
