#!/usr/bin/env node
/**
 * Validates the Wuhan Xiaoshengchu source *staging* packet.
 * Never validates or approves the underlying exams for public distribution.
 * Run: node scripts/validate_xiaoshengchu_staging.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs/data-staging/xiaoshengchu/wuhan-2026");
const read = (filename) => JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
const manifest = read("manifest.json");
const sources = [];
const forbiddenFields = new Set([
  "local_path", "localPath", "source_file", "sourceFile", "rawImage", "imageBytes",
  "questionText", "stem", "answer", "solution", "accessToken", "privateKey",
  "userId", "phone", "studentName", "examAttempt"
]);
const forbiddenPath = /(?:[A-Za-z]:\\\\|\/mnt\/disk\d|\/home\/master|\\\\Users\\\\)/i;
const seenIds = new Set(), seenUrls = new Set();

assert.equal(manifest.schemaVersion, "1.0");
assert.equal(manifest.dataset, "wuhan-k12-xiaoshengchu-2026");
assert.equal(manifest.targetDomain, "school");
assert.equal(manifest.targetSubcategory, "xiaoshengchu");

for (let i = 1; i <= 5; i++) {
  const filename = `sources-${String(i).padStart(2, "0")}.json`;
  const part = read(filename);
  assert.equal(part.schemaVersion, "1.0");
  assert.equal(part.visibility, "staging-only");
  for (const entry of part.items) {
    assert.equal(entry.publicationStatus, "staging_only");
    assert.equal(entry.publishable, false);
    assert.equal(entry.rightsStatus, "unverified");
    assert.equal(entry.authenticityStatus, "unverified");
    assert.equal(entry.fullExamObtained, false);
    assert.equal(typeof entry.title, "string");
    assert(entry.title.length > 0);
    assert(!seenIds.has(entry.sourceId), `duplicate source ID: ${entry.sourceId}`);
    seenIds.add(entry.sourceId);
    const url = new URL(entry.sourceUrl);
    assert(["https:", "http:"].includes(url.protocol));
    assert(!seenUrls.has(entry.sourceUrl), `duplicate source URL: ${entry.sourceUrl}`);
    seenUrls.add(entry.sourceUrl);
    for (const key of Object.keys(entry)) assert(!forbiddenFields.has(key), `forbidden field: ${key}`);
    assert(!forbiddenPath.test(JSON.stringify(entry)), "contains private local path");
    sources.push(entry);
  }
}

const claims = read("claims.json");
assert.equal(claims.schemaVersion, "1.0");
assert.equal(claims.visibility, "staging-only");
for (const item of claims.items) {
  assert.equal(item.publishable, false);
  assert.equal(item.authenticityStatus, "unverified");
  assert(["https:", "http:"].includes(new URL(item.sourceUrl).protocol));
  assert(seenUrls.has(item.sourceUrl), `unindexed claim source: ${item.sourceUrl}`);
}
assert.equal(sources.length, manifest.privateCorpusCounts.source_links);
assert.equal(claims.items.length, manifest.privateCorpusCounts.school_source_claims);
assert.equal(sources.length, 182);
assert.equal(claims.items.length, 39);
assert.equal(manifest.files.filter(x => x.file.startsWith("sources-")).reduce((n,x)=>n+x.count,0), sources.length);
assert.equal(manifest.privateCorpusCounts.ocr_question_candidates_unverified, 808);
assert.equal(manifest.privateCorpusCounts.manual_digitization_pilot_questions_not_officially_verified, 8);
assert.equal(manifest.privateCorpusCounts.real_2026_full_papers_officially_verified, 0);

console.log(`SOCTHINK_XIAOSHENGCHU_STAGING_PASS sources=${sources.length} claims=${claims.items.length} publishable=0 verified_full_papers=0`);
