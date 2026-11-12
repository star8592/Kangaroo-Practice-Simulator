import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dataDirectory, readHistory, saveSnapshot } from "./seo_monitor_daily.mjs";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-seo-isolated-"));
const oldDir = path.join(home, "identity");
const seoDir = path.join(home, "seo-history");
const oldSeo = process.env.SOCTHINK_SEO_DATA_DIR;
const oldUser = process.env.SOCTHINK_USER_DATA_DIR;
try {
  process.env.SOCTHINK_USER_DATA_DIR = oldDir;
  process.env.SOCTHINK_SEO_DATA_DIR = seoDir;
  assert.equal(dataDirectory(), seoDir, "SEO-only env must override legacy user store");
  const snap = {
    date: "2026-11-12",
    observedAt: "2026-11-12T10:00:00.000Z",
    sitemapCount: 73,
    checkedCount: 73,
    healthyCount: 73,
    robotsOk: true,
    failures: [],
  };
  assert.equal(saveSnapshot(snap), 1);
  assert.deepEqual(readHistory(), [snap]);
  assert.equal(fs.existsSync(oldDir), false, "legacy identity dir must never be created");
  assert.equal(fs.readdirSync(seoDir).join(","), "seo-monitor-snapshots.json");
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(seoDir).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(seoDir, "seo-monitor-snapshots.json")).mode & 0o777, 0o600);
  }
  assert.equal(saveSnapshot({...snap, observedAt: "2026-11-12T11:00:00.000Z"}), 1);
  assert.equal(readHistory().length, 1, "daily history stays idempotent");
  delete process.env.SOCTHINK_SEO_DATA_DIR;
  assert.equal(dataDirectory(), oldDir, "legacy fallback protects in-flight deployments");
  delete process.env.SOCTHINK_USER_DATA_DIR;
  assert.equal(dataDirectory(), path.join(process.cwd(), "private", "seo"));
  console.log("SEO_STORAGE_ISOLATION=PASS no_identity_write=true modes=0700_0600 history_idempotent=true legacy_fallback=true");
} finally {
  if (oldSeo === undefined) delete process.env.SOCTHINK_SEO_DATA_DIR;
  else process.env.SOCTHINK_SEO_DATA_DIR = oldSeo;
  if (oldUser === undefined) delete process.env.SOCTHINK_USER_DATA_DIR;
  else process.env.SOCTHINK_USER_DATA_DIR = oldUser;
  fs.rmSync(home, { recursive: true, force: true });
}
