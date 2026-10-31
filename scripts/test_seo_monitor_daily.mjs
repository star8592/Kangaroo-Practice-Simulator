import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ORIGIN, parseSitemap, inspectHtml, readHistory, saveSnapshot,
} from "./seo_monitor_daily.mjs";

const canonical = (url) => '<html><head><link rel="canonical" href="' + url +
  '"></head><body><h1>Real page</h1></body></html>';

test("one canonical sitemap URL is not an index count", () => {
  assert.deepEqual(parseSitemap('<urlset><url><loc>' + ORIGIN +
    '/math-practice</loc></url></urlset>'), [ORIGIN + "/math-practice"]);
});

test("sitemap rejects off-domain or duplicate targets", () => {
  assert.throws(() => parseSitemap('<urlset><url><loc>https://evil.example/</loc></url></urlset>'));
  assert.throws(() => parseSitemap('<urlset><url><loc>' + ORIGIN + '/</loc></url>' +
    '<url><loc>' + ORIGIN + '/</loc></url></urlset>'));
  assert.throws(() => parseSitemap('<urlset><url><loc>' + ORIGIN + '/?key=test</loc></url></urlset>'));
});

test("crawl checks never claim an engine indexed a page", () => {
  const url = ORIGIN + "/math-practice";
  const result = inspectHtml(url, canonical(url), url, 200, "text/html");
  assert.equal(result.ok, true);
  assert.equal("indexedCount" in result, false);
  assert.equal(inspectHtml(url, canonical(ORIGIN + "/elsewhere"), url, 200, "text/html").issue, "CANONICAL");
  assert.equal(inspectHtml(url, canonical(url), url, 404, "text/html").issue, "HTTP_404");
  assert.equal(inspectHtml(url, canonical(url).replace("<h1>", '<meta name="robots" content="noindex"><h1>'),
    url, 200, "text/html").issue, "NOINDEX");
});

test("same-day run replaces a daily history snapshot, retained privately", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-seo-monitor-"));
  const file = path.join(dir, "snapshots.json");
  const base = { date: "2026-11-01", observedAt: "2026-11-01T00:00:00.000Z",
    sitemapCount: 15, healthyCount: 15, robotsOk: true, failures: [] };
  try {
    saveSnapshot(base, file);
    saveSnapshot({ ...base, healthyCount: 14, failures: [{ path: "/math-practice", ok: false, issue: "CANONICAL" }] }, file);
    const saved = readHistory(file);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].healthyCount, 14);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal("indexCount" in saved[0], false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
