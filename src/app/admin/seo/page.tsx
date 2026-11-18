import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {canManagePlatform} from "@/lib/platform-admin-principal";
import { getSeoMonitorDashboard } from "@/lib/seo-monitor-store";
import AdminOperationsNav from "@/components/AdminOperationsNav";
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
  if (!canManagePlatform(jar)) redirect("/admin/login");

  const { latest, history, ageHours, siteStatus, sourceStatus, providerDataStatus, providers } = getSeoMonitorDashboard();
  const statusCopy = siteStatus === "healthy" ? "正常" :
    siteStatus === "issues" ? "发现异常" :
    siteStatus === "stale" ? "数据过期" :
    siteStatus === "read_error" ? "历史读取失败" : "尚未采集";

  return (
    <div className={styles.page} data-site-shell="content">
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
      <AdminOperationsNav />

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
            <p>抽检通过 URL</p>
            <strong>{latest ? SHOW_DASH(latest.healthyCount) : "—"}</strong>
            <small>本轮检查 {latest ? latest.checkedCount : "—"} 个 URL 的 HTTP、Canonical 与 H1</small>
          </article>
          <article className={styles.card}>
            <p>抽检异常 URL</p>
            <strong>{latest ? SHOW_DASH(latest.checkedCount - latest.healthyCount) : "—"}</strong>
            <small>检测到异常时，下方会列明具体页面</small>
          </article>
          <article className={styles.card}>
            <p>最近一次采集</p>
            <strong className={styles.timeValue}>{latest ? humanTime(latest.observedAt) : "未采集"}</strong>
            <small>{ageHours !== null ? "距今约 " + ageHours + " 小时" :
              siteStatus === "read_error" ? "采集文件存在格式或读取错误，请检查采集日志与文件权限" :
              "尚无有效采集记录，请检查定时服务"}</small>
          </article>
        </div>
        <p className={styles.disclaimer}>
          采集来源：本站 SEO 定时抓取任务；历史读取状态：{sourceStatus === "ok" ? "已读取持久化记录" :
            sourceStatus === "missing" ? "尚无记录文件" :
            sourceStatus === "invalid" ? "记录文件格式错误" : "记录文件读取失败"}。
          这里显示的是公开网址技术抽检（最多 200 个 URL），不是百度、Google 或 Bing 的已收录数量。
          已测数据超过 36 小时会标记过期，采集失败不会伪装成正常或 0。
        </p>
      </section>

      <section aria-labelledby="index-source" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="index-source">搜索引擎真实收录与自然搜索表现</h2>
          <span className={styles.unknownStatus}>{providers.some(p => p.sourceStatus === "reported" || p.sourceStatus === "stale") ? "已接入部分正式报表" : "等待官方报表接入"}</span>
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
                  <td>
                    <span className={provider.sourceStatus === "reported" ? styles.successStatus : styles.unknownStatus}>
                      {provider.sourceStatus === "reported" ? "已有正式报表" :
                       provider.sourceStatus === "stale" ? "报表待更新" :
                       provider.sourceStatus === "read_error" ? "报表读取异常" : "暂无正式报表"}
                    </span>
                    <div className={styles.source}>{provider.source}</div>
                    {provider.observedAt ? <div className={styles.source}>最近导入：{humanTime(provider.observedAt)}</div> : null}
                    <a href={provider.dashboardUrl} target="_blank" rel="noopener noreferrer">官方站长后台</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.disclaimer}>
          报表存储状态：{providerDataStatus === "ok" ? "已读取" :
            providerDataStatus === "missing" ? "未接入" :
            providerDataStatus === "invalid" ? "格式错误" : "读取失败"}。
          只有来自站长资产的正式报表/API，才能成为收录与搜索流量数据；
          Google Sitemap API 中已废弃的 indexed 字段、site: 搜索估计以及 IndexNow HTTP 200/202 回执均不计入收录。
        </p>
      </section>

      <section aria-labelledby="history-title" className={styles.section}>
        <h2 id="history-title">最近 30 次日度抓取检查</h2>
        {history.length ? (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th>日期（UTC）</th><th>Sitemap URL</th><th>抽检样本</th><th>抽检通过</th><th>抓取异常</th><th>robots</th><th>采集时间（北京时间）</th></tr></thead>
              <tbody>{[...history].reverse().map((day) => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  <td className={styles.number}>{day.sitemapCount}</td>
                  <td className={styles.number}>{day.checkedCount}</td><td className={styles.number}>{day.healthyCount}</td>
                  <td className={styles.number}>{day.checkedCount - day.healthyCount}</td>
                  <td>{day.robotsOk ? "正常" : "异常"}</td>
                  <td>{humanTime(day.observedAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className={styles.empty}>{siteStatus === "read_error" ?
          "已有采集记录可能无法读取，请检查 SEO 专用数据目录、权限和 JSON 格式。" :
          "尚无日度监测样本。监控任务第一次成功运行后会自动保留历史记录。"}</p>}
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
          百度接入“索引量”与“流量关键词”官方报表，Google 接入 Search Console 页面索引与 Search Analytics，
          Bing 接入 Webmaster Tools 的索引与搜索流量报表。正式报表按采集来源和统计区间归档；
          没有正式数据时保持未知，不能把提交、抓取或 site: 估计当作收录。
          真正的购买收入应由独立收费账本统计，不能用自然搜索点击数来估算。
        </p>
      </section>
    </div>
  );
}
