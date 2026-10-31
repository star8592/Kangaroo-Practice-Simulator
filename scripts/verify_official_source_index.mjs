#!/usr/bin/env node
// A lightweight integrity audit for the public source index, not a new release gate.
// Official/reference pages are never treated as proof of commercial redistribution rights.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(process.cwd());
const index = JSON.parse(readFileSync(resolve(root, "data/discovery/official-source-index-20261031.json"), "utf8"));
const drafts = JSON.parse(readFileSync(resolve(root, "data/discovery/original-product-drafts-20261031.json"), "utf8"));
const seen = new Set();
const allowedHosts = new Set([
  "cemc.uwaterloo.ca", "live.poshenloh.com", "mathkangaroo.org",
  "ielts.org", "www.ets.org", "satsuite.collegeboard.org", "maa.org",
  "zhejiang.chinatax.gov.cn",
]);
assert.equal(index.records.length, 29);
for (const row of index.records) {
  assert.ok(!seen.has(row.id), "duplicate: " + row.id);
  seen.add(row.id);
  const url = new URL(row.sourceUrl);
  assert.equal(url.protocol, "https:");
  assert.ok(allowedHosts.has(url.hostname), "unreviewed source: " + url.hostname);
  assert.ok(row.year === null || (row.year >= 2024 && row.year <= 2026));
  assert.equal(row.commercialSaleAllowed, false);
  assert.equal(row.redistributionRights, "not_verified");
  assert.equal(row.resourceState, "external_source_index");
}
assert.equal(drafts.products.length, 3);
for (const row of drafts.products) {
  assert.equal(row.publicationState, "local_draft");
  assert.equal(row.purchaseEnabled, false);
  assert.equal(row.rights, "original_owned");
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(row.priceFen) && row.priceFen >= 100);
}
console.log("OFFICIAL_SOURCE_INDEX=PASS count=" + seen.size);
console.log("ORIGINAL_PRODUCTS_DRAFTS=PASS count=" + drafts.products.length);
console.log("UNVERIFIED_COMMERCIAL_LISTINGS=0");
