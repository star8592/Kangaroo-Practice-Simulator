import fs from "node:fs";
import { userDataPath } from "@/lib/user-data-store";

export type SeoCrawlFailure = Readonly<{ path: string; ok: false; issue: string }>;
export type SeoDailySnapshot = Readonly<{
  date: string;
  observedAt: string;
  sitemapCount: number;
  healthyCount: number;
  robotsOk: boolean;
  failures: SeoCrawlFailure[];
}>;

const HISTORY_FILE = "seo-monitor-snapshots.json";
const MAX_HISTORY = 365;

export function validSeoSnapshot(x: unknown): x is SeoDailySnapshot {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return typeof v.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    typeof v.observedAt === "string" && !Number.isNaN(Date.parse(v.observedAt)) &&
    Number.isInteger(v.sitemapCount) && (v.sitemapCount as number) >= 0 &&
    Number.isInteger(v.healthyCount) && (v.healthyCount as number) >= 0 &&
    (v.healthyCount as number) <= (v.sitemapCount as number) &&
    typeof v.robotsOk === "boolean" && Array.isArray(v.failures) && v.failures.length <= 500 &&
    v.failures.every((f: unknown) => !!f && typeof f === "object" &&
      typeof (f as SeoCrawlFailure).path === "string" &&
      typeof (f as SeoCrawlFailure).issue === "string");
}

export function readSeoSnapshots(): SeoDailySnapshot[] {
  const file = userDataPath(HISTORY_FILE);
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    return Array.isArray(value) ? value.filter(validSeoSnapshot).slice(-MAX_HISTORY) : [];
  } catch {
    // Missing history or a disk/storage error is not a successful zero-count report.
    return [];
  }
}

export type SeoProvider = Readonly<{
  id: "baidu" | "google" | "bing";
  name: string;
  indexCount: number | null;
  clicks: number | null;
  impressions: number | null;
  observedAt: string | null;
  sourceStatus: "not_connected";
  source: string;
  dashboardUrl: string;
}>;

// No public site: query, Google sitemap "indexed" (deprecated), or submitted
// IndexNow count is a reliable measure of the provider's actual index size.
export const PROVIDERS: readonly SeoProvider[] = [
  {
    id: "baidu", name: "百度搜索", indexCount: null, clicks: null, impressions: null,
    observedAt: null, sourceStatus: "not_connected",
    source: "百度搜索资源平台 · 索引量（待站点验证授权）",
    dashboardUrl: "https://ziyuan.baidu.com/indexs/",
  },
  {
    id: "google", name: "Google", indexCount: null, clicks: null, impressions: null,
    observedAt: null, sourceStatus: "not_connected",
    source: "Google Search Console · 页面索引报告/URL Inspection（待授权）",
    dashboardUrl: "https://search.google.com/search-console",
  },
  {
    id: "bing", name: "Bing", indexCount: null, clicks: null, impressions: null,
    observedAt: null, sourceStatus: "not_connected",
    source: "Bing Webmaster Tools · Site Explorer/URL Inspection（待授权）",
    dashboardUrl: "https://www.bing.com/webmasters",
  },
];

export function getSeoMonitorDashboard() {
  const history = readSeoSnapshots();
  const latest = history.at(-1) || null;
  const ageHours = latest
    ? Math.max(0, Math.floor((Date.now() - Date.parse(latest.observedAt)) / 3_600_000))
    : null;
  const siteStatus = !latest ? "not_measured" :
    ageHours === null || ageHours > 36 ? "stale" :
    latest.robotsOk && latest.healthyCount === latest.sitemapCount ? "healthy" : "issues";
  return { latest, history: history.slice(-30), ageHours, siteStatus, providers: PROVIDERS };
}
