/**
 * Generates one public-metadata-only catalog from the EXISTING training-ready
 * gate. One durable atomic write. No cron, no second question authority.
 *
 * Requires SOCTHINK_CATALOG_SNAPSHOT=/absolute/private/path/catalog.json.
 * Operators then send SIGHUP to the single Rust catalog service, when active.
 */
import {listTrainingExamProfiles} from "../src/lib/training-question-bank";
import {buildTrainingResourceCatalog} from "../src/lib/resource-catalog";
import {writeCatalogSnapshotAtomic} from "./lib/catalog-snapshot-atomic";

const output=process.env.SOCTHINK_CATALOG_SNAPSHOT;
if(!output)throw new Error("SOCTHINK_CATALOG_SNAPSHOT is required");
const rows=buildTrainingResourceCatalog(listTrainingExamProfiles());
const result=writeCatalogSnapshotAtomic(output,{
  version:1,generatedAt:new Date().toISOString(),rows,
});
console.log("TRAINING_CATALOG_ATOMIC_PUBLISH=PASS rows="+result.rows+
  " bytes="+result.bytes+" sha256="+result.sha256);
