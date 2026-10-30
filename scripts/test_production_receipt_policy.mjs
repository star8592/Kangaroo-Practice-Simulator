import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const workflow=readFileSync(".github/workflows/production-receipt.yml","utf8");
const ci=readFileSync(".github/workflows/ci.yml","utf8");
// A feature-branch CI completion must not cancel a receipt for a main push.
assert.match(workflow,/group:\s*production-receipt-\$\{\{\s*github\.event\.workflow_run\.head_branch\s*\}\}/);
assert.match(workflow,/github\.event\.workflow_run\.conclusion\s*==\s*'success'/);
assert.match(workflow,/github\.event\.workflow_run\.event\s*==\s*'push'/);
assert.match(workflow,/github\.event\.workflow_run\.head_branch\s*==\s*'main'/);
assert.match(ci,/node scripts\/test_production_receipt_policy\.mjs/);
console.log("PRODUCTION_RECEIPT_POLICY=PASS branch_isolated push_main_only");
