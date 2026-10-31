#!/usr/bin/env node
/**
 * SOC THINK public discoverability monitor.
 * A separate read-only site probe, not a search-index counter. Only official
 * verified webmaster reports may supply engine-specific index counts.
 */
import fs from "node:fs";
import path from "node:path";

export const ORIGIN = "https://socthink.cn";
const MAX_URLS = 500;
const TIMEOUT_MS = 9000;
const HISTORY_LIMIT = 365;
const STORE_FILE = "seo-monitor-snapshots.json";

function dataDirectory() {
  return process.env.SOCTHINK_USER_DATA_DIR?.trim()
    ? path.resolve(process.env.SOCTHINK_USER_DATA_DIR.trim())
    : path.join(process.cwd(), "private", "users");
}

function storePath() {
  return path.join(dataDirectory(), STORE_FILE);
}

function requestFor(url) {
  return fetch(url, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "SOCTHINK-SEO-Availability-Monitor/1.0" },
  });
}

export function parseSitemap(xml) {
  if (typeof xml !== "string" || !/<urlset(?:\s|>)/i.test(xml)) throw new Error("INVALID_SITEMAP_XML");
  const entries = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)];
  if (entries.length < 1 || entries.length > MAX_URLS) throw new Error("INVALID_SITEMAP_URL_COUNT");
  const urls = [];
  for (const match of entries) {
    const value = match[1].replaceAll("&amp;", "&").trim();
    const parsed = new URL(value);
    if (parsed.origin !== ORIGIN || parsed.search || parsed.hash || (parsed.pathname.includes("//"))) {
      throw new Error("SITEMAP_FOREIGN_OR_NONCANONICAL_URL");
    }
    if (urls.includes(value)) throw new Error("DUPLICATE_SITEMAP_URL");
    urls.push(value);
  }
  return urls;
}

export function inspectHtml(url, html, finalUrl, status, contentType) {
  const tag = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0] ?? "";
  const canonical = tag.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? null;
  const robotsTag = html.match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i)?.[0] ?? "";
  const noindex = /\bnoindex\b/i.test(robotsTag) || /<meta\b[^>]*\bcontent=["'][^"']*noindex/i.test(html);
  const goodCanonical = canonical && canonical.replace(/\/$/, "") === url.replace(/\/$/, "");
  const issue = status !== 200 ? "HTTP_" + status
    : finalUrl !== url ? "REDIRECT"
    : !contentType.toLowerCase().includes("text/html") ? "NOT_HTML"
    : !goodCanonical ? "CANONICAL"
    : noindex ? "NOINDEX"
    : !/<h1(?:\s|>)/i.test(html) ? "NO_H1" : null;
  return { path: new URL(url).pathname, ok: issue === null, issue };
}

async function checkOne(url) {
  try {
    const response = await requestFor(url);
    const body = (await response.text()).slice(0, 200_000);
    return inspectHtml(url, body, response.url, response.status, response.headers.get("content-type") || "");
  } catch (error) {
    return { path: new URL(url).pathname, ok: false, issue: error?.name === "TimeoutError" ? "TIMEOUT" : "FETCH_ERROR" };
  }
}

async function limitedMap(items, fn, concurrency = 5) {
  const result = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      result[i] = await fn(items[i]);
    }
  }));
  return result;
}

export async function captureSeoSnapshot() {
  const started = new Date();
  const sitemapResponse = await requestFor(ORIGIN + "/sitemap.xml");
  if (!sitemapResponse.ok) throw new Error("SITEMAP_HTTP_" + sitemapResponse.status);
  const urls = parseSitemap(await sitemapResponse.text());
  const robotsResponse = await requestFor(ORIGIN + "/robots.txt");
  const robots = robotsResponse.ok ? await robotsResponse.text() : "";
  const robotsOk = robotsResponse.ok && robots.includes("Sitemap: " + ORIGIN + "/sitemap.xml");
  const pages = await limitedMap(urls, checkOne);
  return {
    date: started.toISOString().slice(0, 10),
    observedAt: new Date().toISOString(),
    sitemapCount: urls.length,
    healthyCount: pages.filter((page) => page.ok).length,
    robotsOk,
    failures: pages.filter((page) => !page.ok).slice(0, 60),
    // NEVER infer indexed pages, Google impressions, Baidu index or sales from crawl health.
  };
}

function isSnapshot(x) {
  return !!x && typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
    typeof x.observedAt === "string" && Number.isInteger(x.sitemapCount) && x.sitemapCount >= 0 &&
    Number.isInteger(x.healthyCount) && x.healthyCount >= 0 &&
    x.healthyCount <= x.sitemapCount && typeof x.robotsOk === "boolean" &&
    Array.isArray(x.failures) && x.failures.length <= MAX_URLS;
}

export function readHistory(file = storePath()) {
  try {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(doc) ? doc.filter(isSnapshot).slice(-HISTORY_LIMIT) : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error("SEO_MONITOR_HISTORY_READ_FAILED");
  }
}

export function saveSnapshot(snapshot, file = storePath()) {
  if (!isSnapshot(snapshot)) throw new Error("SEO_MONITOR_INVALID_SNAPSHOT");
  const previous = readHistory(file);
  // One authoritative daily record; a rerun replaces that day's observation.
  const history = [...previous.filter((x) => x.date !== snapshot.date), snapshot]
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-HISTORY_LIMIT);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = file + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(history, null, 2), { mode: 0o600, flag: "wx" });
  try { fs.renameSync(tmp, file); } finally { try { fs.unlinkSync(tmp); } catch {} }
  return history.length;
}

async function main() {
  const snap = await captureSeoSnapshot();
  const days = saveSnapshot(snap);
  console.log("SEO_PUBLIC_DISCOVERY_SNAPSHOT=" + JSON.stringify({ ...snap, storedDays: days }));
  // A public failure is reported in logs and dashboard, without blocking website deployment.
  if (!snap.robotsOk || snap.healthyCount !== snap.sitemapCount) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error("SEO_MONITOR_ERROR=" + String(err?.message || err).slice(0, 200));
    process.exitCode = 2;
  });
}
