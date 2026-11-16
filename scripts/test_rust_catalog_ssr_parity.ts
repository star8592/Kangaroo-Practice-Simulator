/**
 * Real-Rust integration for the Next.js SSR presentation adapter.
 * Requires a private, read-only catalogue snapshot and an actual local Axum
 * process. No user, answer, entitlement or payment record is read or written.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {readRustTrainingCatalog,RustCatalogUnavailable} from "../src/lib/rust-catalog-read";
import type {ResourceListing} from "../src/lib/resource-catalog";

async function main(){
 const path=process.env.SOCTHINK_CATALOG_SNAPSHOT;
 const base=process.env.SOCTHINK_RUST_CATALOG_INTERNAL_URL;
 assert(path && base,"Must provide private snapshot path and local Rust URL");
 const snapshot=JSON.parse(fs.readFileSync(path,"utf8")) as {
   version:number;rows:ResourceListing[];
 };
 assert.equal(snapshot.version,1);
 const expected=snapshot.rows.filter(x=>x.paperType!=="smart");
 const actual=await readRustTrainingCatalog();
 assert.deepEqual(actual,expected,"SSR catalogue must come from the REAL Rust paged API in exact order");
 assert(actual.length>0);
 // The SSR reader must never accept arbitrary upstream URLs.
 process.env.SOCTHINK_RUST_CATALOG_INTERNAL_URL="http://example.com:1234";
 await assert.rejects(()=>readRustTrainingCatalog(),(e:unknown)=>
   e instanceof RustCatalogUnavailable&&e.message.includes("non-loopback"));
 process.env.SOCTHINK_RUST_CATALOG_INTERNAL_URL="http://127.0.0.1:37991";
 await assert.rejects(()=>readRustTrainingCatalog(),(e:unknown)=>
   e instanceof RustCatalogUnavailable&&e.message.includes("upstream-unreachable"));
 delete process.env.SOCTHINK_RUST_CATALOG_INTERNAL_URL;
 await assert.rejects(()=>readRustTrainingCatalog(),(e:unknown)=>
   e instanceof RustCatalogUnavailable&&e.message.includes("upstream-not-configured"));
 process.env.SOCTHINK_RUST_CATALOG_INTERNAL_URL=base;
 console.log("RUST_CATALOG_SSR_PARITY=PASS snapshotRows="+snapshot.rows.length+
   " visibleRows="+actual.length+" no_legacy_fallback=true ssrf_rejected=true unreachable_rejected=true");
}
main().catch(e=>{console.error(e);process.exitCode=1});
