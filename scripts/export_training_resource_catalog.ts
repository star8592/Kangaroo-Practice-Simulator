/**
 * Contract handoff for the Rust R1 resource-query adapter.
 *
 * IMPORTANT: source of truth stays in the existing training-readiness gate.
 * Export ONLY allowlisted public ResourceListing fields, not question bodies,
 * answers, source paths, rights policies, buyer identities or entitlements.
 *
 * Usage (private server, not a public download):
 * npx tsx scripts/export_training_resource_catalog.ts > /secure/catalog.json
 */
import { listTrainingExamProfiles } from "../src/lib/training-question-bank";
import { buildTrainingResourceCatalog } from "../src/lib/resource-catalog";

const rows = buildTrainingResourceCatalog(listTrainingExamProfiles());
process.stdout.write(
  JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), rows }) + "\n",
);
