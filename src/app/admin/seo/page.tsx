import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { getSeoMonitorDashboard } from "@/lib/seo-monitor-store";
import styles from "./seo.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "SEO 收录与搜索增长监控 | SOC THINK 管理后台",
  robots: { index: false, follow: false, noarchive: true },
};

const SHOW_DASH = (value: number | null): string => value === null ? "—" : value.toLocaleString("zh-CN");
function humanTime(iso: string) {
  return Number.isNaN(Date.parse(iso)) ? "未记录" :
    new Date(iso).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}

export default async function AdminSeoDashboard() {
  const jar = await cookies();
  const user = userFromSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/admin/login");
  if (!isAdmin(user)) redirect("/");

  const { latest, history, ageHours, siteStatus, providers } = getSeoMonitorDashboard();
  const statusCopy = siteStatus === "healthy" ? "正常" :
    siteStatus === "issues" ? "发现异常" :
    siteStatus === "stale" ? "数据过期" : "尚未采集";

  return (
    <main className={styles.page} data-site-shell="content">
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>SOC THINK / OPERATIONS</span>
          <h1>搜索收录与增长监控</h1>
          <p>把“能被抓取、被搜索引擎收录、获得曝光、实际点击”分开监测，避免以提交成功代替真实增长。</p>
        </div>
        <nav aria-label="后台导航" className={styles.actions}>
          <Link href="/admin/students">学生管理</Link>
          <Link href="/admin/questions">题目管理</Link>
          <Link href="/sitemap.xml" target="_blank">查看 Sitemap</Link>
        </nav>
      </header>

      <section aria-labelledby="site-health" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="site-health">本站公开页面抓取状态</h2>
          <span className={siteStatus === "healthy" ? styles.successStatus : styles.unknownStatus}>
            {statusCopy}
          </span>
        </div>
        <div className={styles.cards}>
          <article className={styles.card}>
            <p>Sitemap 公开 URL</p>
            <strong>{latest ? SHOW_DASH(latest.sitemapCount) : "—"}</strong>
            <small>本站生成的公开网址数，不是搜索引擎收录量</small>
          </article>
          <article className={styles.card}>
            <p>实测可抓取 URL</p>
            <strong>{latest ? SHOW_DASH(latest.healthyCount) : "—"}</strong>
            <small>检测实际 HTTP、Canonical、H1、robots 等条件</small>
          </article>
          <article className={styles.card}>
            <p>抓取问题 URL</p>
            <strong>{latest ? SHOW_DASH(latest.sitemapCount - latest.healthyCount) : "—"}</strong>
            <small>检测到异常时，下方会列明具体页面</small>
          </article>
          <article className={styles.card}>
            <p>最近一次采集</p>
            <strong className={styles.timeValue}>{latest ? humanTime(latest.observedAt) : "未采集"}</strong>
            <small>{ageHours !== null ? "距今约 " + ageHours + " 小时" : "定时采集启动后产生第一份记录"}</small>
          </article>
        </div>
        <p className={styles.disclaimer}>
          这里显示的是公开网址技术检查，不是百度、Google 或 Bing 的已收录数量。
          已测数据超过 36 小时会标记过期，采集失败不会伪装成正常或 0。
        </p>
      </section>

      <section aria-labelledby="index-source" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="index-source">搜索引擎真实收录与自然搜索表现</h2>
          <span className={styles.unknownStatus}>等待官方账号授权</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr><th>来源</th><th>真实收录页数</th><th>搜索曝光</th><th>自然点击</th><th>采集状态与来源</th></tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id}>
                  <td><strong>{provider.name}</strong></td>
                  <td className={styles.number}>{SHOW_DASH(provider.indexCount)}</td>
                  <td className={styles.number}>{SHOW_DASH(provider.impressions)}</td>
                  <td className={styles.number}>{SHOW_DASH(provider.clicks)}</td>
                  <td><span className={styles.unknownStatus}>尚未接入</span>
                    <div className={styles.source}>{provider.source}</div>
                    <a href={provider.dashboardUrl} target="_blank" rel="noopener noreferrer">官方站长后台</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.disclaimer}>
          只有来源于已验证站长资产的正式报表/API，才能成为真实收录数据；
          Google Sitemap API 中已废弃的 indexed 字段、site: 搜索估计以及 IndexNow HTTP 200/202 回执均不计入收录。
        </p>
      </section>

      <section aria-labelledby="history-title" className={styles.section}>
        <h2 id="history-title">最近 30 次日度抓取检查</h2>
        {history.length ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th>日期（UTC）</th><th>Sitemap URL</th><th>实测通过</th><th>抓取异常</th><th>robots</th><th>采集时间（北京时间）</th></tr></thead>
              <tbody>{[...history].reverse().map((day) => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  <td className={styles.number}>{day.sitemapCount}</td>
                  <td className={styles.number}>{day.healthyCount}</td>
                  <td className={styles.number}>{day.sitemapCount - day.healthyCount}</td>
                  <td>{day.robotsOk ? "正常" : "异常"}</td>
                  <td>{humanTime(day.observedAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className={styles.empty}>尚无日度监测样本。监控任务第一次成功运行后会自动保留历史记录。</p>}
      </section>

      {latest?.failures.length ? (
        <section aria-labelledby="failures" className={styles.section}>
          <h2 id="failures">需要排查的公开网址</h2>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th>URL 路径</th><th>异常类型</th></tr></thead>
              <tbody>{latest.failures.map((item) => (
                <tr key={item.path}><td><code>{item.path}</code></td><td>{item.issue}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={styles.next}>
        <h2>下一步数据接入</h2>
        <p>
          百度接入“索引量”官方报表，Google 接入 Search Console 页面索引与 Search Analytics，
          Bing 接入 Webmaster Tools 的索引与流量报表。账号授权完成后才显示数字。
          真正的购买收入应由独立收费账本统计，不能用自然搜索点击数来估算。
        </p>
      </section>
    </main>
  );
}
