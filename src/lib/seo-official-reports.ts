import fs from "node:fs";
import path from "node:path";

export type SeoEngine = "baidu" | "google" | "bing";
export type OfficialSeoMetric = "indexCount" | "clicks" | "impressions";
export type OfficialSeoSource =
  | "baidu_index_report_export"
  | "baidu_search_performance_export"
  | "google_search_analytics_api"
  | "google_page_indexing_report_export"
  | "bing_webmaster_api"
  | "bing_site_explorer_export";

export type OfficialSeoRecord = Readonly<{
  site: "https://socthink.cn";
  provider: SeoEngine;
  metric: OfficialSeoMetric;
  value: number;
  periodStart: string;
  periodEnd: string;
  importedAt: string;
  source: OfficialSeoSource;
  evidenceSha256: string;
}>;

export type OfficialSeoReadStatus = "ok" | "missing" | "invalid" | "unreadable";
export type OfficialSeoProviderStatus = "not_connected" | "reported" | "stale" | "read_error";
export type OfficialSeoProviderResult = Readonly<{
  indexCount: number | null;
  clicks: number | null;
  impressions: number | null;
  status: OfficialSeoProviderStatus;
  observedAt: string | null;
  source: string;
}>;

const SOURCES: Record<OfficialSeoSource, {engine: SeoEngine; metrics: readonly OfficialSeoMetric[]; label: string}> = {
  baidu_index_report_export: {engine:"baidu", metrics:["indexCount"], label:"百度搜索资源平台索引量导出"},
  baidu_search_performance_export: {engine:"baidu", metrics:["clicks","impressions"], label:"百度搜索资源平台流量关键词导出"},
  google_search_analytics_api: {engine:"google", metrics:["clicks","impressions"], label:"Google Search Console Search Analytics API"},
  google_page_indexing_report_export: {engine:"google", metrics:["indexCount"], label:"Google Search Console 页面索引报告导出"},
  bing_webmaster_api: {engine:"bing", metrics:["clicks","impressions"], label:"Bing Webmaster API"},
  bing_site_explorer_export: {engine:"bing", metrics:["indexCount"], label:"Bing Webmaster Site Explorer 导出"},
};
const SOURCE_KEYS = Object.keys(SOURCES);
const METRIC_KEYS: readonly OfficialSeoMetric[] = ["indexCount","clicks","impressions"];
const ENGINE_KEYS: readonly SeoEngine[] = ["baidu","google","bing"];
const SHA_256 = /^[0-9a-f]{64}$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RECORDS = 2200;

function validDay(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DAY.test(s)) return false;
  const d = new Date(s+"T00:00:00.000Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === s;
}

export function validOfficialSeoRecord(x: unknown): x is OfficialSeoRecord {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  if (r.site !== "https://socthink.cn" ||
      !ENGINE_KEYS.includes(r.provider as SeoEngine) ||
      !METRIC_KEYS.includes(r.metric as OfficialSeoMetric) ||
      !SOURCE_KEYS.includes(r.source as string)) return false;
  const definition = SOURCES[r.source as OfficialSeoSource];
  if (definition.engine !== r.provider || !definition.metrics.includes(r.metric as OfficialSeoMetric)) return false;
  if (!Number.isSafeInteger(r.value) || (r.value as number) < 0 ||
      (r.value as number) > 1_000_000_000_000) return false;
  if (!validDay(r.periodStart) || !validDay(r.periodEnd) || r.periodStart > r.periodEnd) return false;
  if (typeof r.importedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(r.importedAt) ||
      !Number.isFinite(Date.parse(r.importedAt))) return false;
  if (typeof r.evidenceSha256 !== "string" || !SHA_256.test(r.evidenceSha256)) return false;
  return true;
}

export function seoOfficialReportsPath(): string {
  const root = process.env.SOCTHINK_SEO_DATA_DIR?.trim();
  const directory = root ? path.resolve(root) : path.join(process.cwd(),"private","seo");
  return path.join(directory,"seo-official-reports.json");
}

export function readOfficialSeoReports(): {status: OfficialSeoReadStatus; reports: OfficialSeoRecord[]} {
  try {
    const filename = seoOfficialReportsPath();
    if (fs.statSync(filename).size > 2_000_000) return {status:"invalid",reports:[]};
    const parsed: unknown = JSON.parse(fs.readFileSync(filename,"utf8"));
    if (!Array.isArray(parsed) || parsed.length > MAX_RECORDS ||
        parsed.some((x: unknown) => !validOfficialSeoRecord(x)))
      return {status:"invalid",reports:[]};
    return {status:"ok",reports:parsed};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {status:"missing",reports:[]};
    return {status:error instanceof SyntaxError?"invalid":"unreadable",reports:[]};
  }
}

export function summarizeOfficialSeoProvider(
  provider: SeoEngine, reports: readonly OfficialSeoRecord[],
  status: OfficialSeoReadStatus, now = new Date()
): OfficialSeoProviderResult {
  const none = {
    indexCount:null, clicks:null, impressions:null, observedAt:null,
    status: status === "invalid" || status === "unreadable" ? "read_error" : "not_connected",
    source: status === "invalid" || status === "unreadable"
      ? "官方报表记录读取失败，请检查专用数据目录" : "等待接入已授权站长平台的正式报表或 API",
  } as const;
  if (status !== "ok") return none;
  const chosen: Partial<Record<OfficialSeoMetric, OfficialSeoRecord>> = {};
  for (const r of reports) {
    if (r.provider !== provider) continue;
    const prev = chosen[r.metric];
    if (!prev || r.periodEnd > prev.periodEnd ||
        (r.periodEnd === prev.periodEnd && r.importedAt > prev.importedAt))
      chosen[r.metric] = r;
  }
  const selected = Object.values(chosen).filter((r):r is OfficialSeoRecord=>Boolean(r));
  if (!selected.length) return none;
  const newest = selected.reduce((a,b)=>a.periodEnd > b.periodEnd ? a : b);
  const ageDays = (now.getTime()-Date.parse(newest.periodEnd+"T00:00:00Z"))/86_400_000;
  const freshWindow = provider === "baidu" ? 9 : 5;
  const reportStatus = ageDays > freshWindow ? "stale" : "reported";
  const label = selected.map(r=>
    (r.metric==="indexCount"?"索引量":r.metric==="clicks"?"点击":"曝光")+
    "："+SOURCES[r.source].label+"（"+r.periodStart+" 至 "+r.periodEnd+"）"
  ).join("；");
  return {
    indexCount:chosen.indexCount?.value ?? null,
    clicks:chosen.clicks?.value ?? null,
    impressions:chosen.impressions?.value ?? null,
    observedAt:newest.importedAt,
    status:reportStatus,
    source:label,
  };
}

export type SeoCollectionState = "imported" | "no_final_rows" | "missing_credentials" | "configured" | "error";
export type SeoCollectorEntry = Readonly<{
  state: SeoCollectionState;
  checkedAt: string;
  importedDays?: number;
  lastPeriod?: string | null;
  reason?: string;
}>;

const COLLECTION_STATES = new Set<SeoCollectionState>(["imported","no_final_rows","missing_credentials","configured","error"]);
const SAFE_REASONS = /^[a-z0-9_]{1,80}$/;

/** Read only narrow collector diagnostics; never ingest token fields. */
export function readSeoCollectionStatus(): {status: OfficialSeoReadStatus; engines: Partial<Record<"google" | "bing", SeoCollectorEntry>>} {
  const filename = path.join(path.dirname(seoOfficialReportsPath()),"seo-collection-status.json");
  try {
    if (fs.statSync(filename).size > 8192) return {status:"invalid",engines:{}};
    const parsed: unknown = JSON.parse(fs.readFileSync(filename,"utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {status:"invalid",engines:{}};
    const entries = parsed as Record<string,unknown>;
    if (Object.keys(entries).some(x=>x!=="google"&&x!=="bing"))
      return {status:"invalid",engines:{}};
    const engines: Partial<Record<"google" | "bing", SeoCollectorEntry>> = {};
    for (const provider of ["google","bing"] as const) {
      if (entries[provider]===undefined) continue;
      const x = entries[provider];
      if (!x || typeof x!=="object" || Array.isArray(x))
        return {status:"invalid",engines:{}};
      const row = x as Record<string,unknown>;
      if (Object.keys(row).some(k=>!["state","checkedAt","importedDays","lastPeriod","reason"].includes(k)))
        return {status:"invalid",engines:{}};
      if (!COLLECTION_STATES.has(row.state as SeoCollectionState) ||
          typeof row.checkedAt!=="string" ||
          !/^\d{4}-\d{2}-\d{2}T/.test(row.checkedAt) ||
          !Number.isFinite(Date.parse(row.checkedAt)) ||
          (row.importedDays!==undefined && (!Number.isSafeInteger(row.importedDays)|| (row.importedDays as number)<0)) ||
          (row.lastPeriod!==undefined && row.lastPeriod!==null && !validDay(row.lastPeriod)) ||
          (row.reason!==undefined && (typeof row.reason!=="string"||!SAFE_REASONS.test(row.reason))))
        return {status:"invalid",engines:{}};
      engines[provider] = row as SeoCollectorEntry;
    }
    return {status:"ok",engines};
  } catch(error) {
    if ((error as NodeJS.ErrnoException).code==="ENOENT") return {status:"missing",engines:{}};
    return {status:error instanceof SyntaxError?"invalid":"unreadable",engines:{}};
  }
}
