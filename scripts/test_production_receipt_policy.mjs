import assert from "node:assert/strict";
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

const read=(path)=>readFileSync(path,"utf8");
const workflow=read(".github/workflows/production-receipt.yml");
const ci=read(".github/workflows/ci.yml");
const mini=read(".github/workflows/miniapp-ci.yml");
const deploy=read("ops/release/auto_deploy_server.sh");
const miniUpload=read("ops/release/miniapp_ci.sh");

assert.match(workflow,/group:\s*production-receipt-\$\{\{\s*github\.event\.workflow_run\.head_branch\s*\}\}/);
assert.match(workflow,/github\.event\.workflow_run\.conclusion\s*==\s*'success'/);
assert.match(workflow,/github\.event\.workflow_run\.event\s*==\s*'push'/);
assert.match(workflow,/github\.event\.workflow_run\.head_branch\s*==\s*'main'/);
assert.match(ci,/node scripts\/test_production_receipt_policy\.mjs/);
assert.match(ci,/name:\s*CI/);
assert.match(ci,/billing-ledger:/);
assert.match(ci,/web-browser-click-e2e:/);
assert.doesNotMatch(ci,/\bminiapp-build-and-contract:/,"Miniapp must not be inside Web deploy CI");
assert.match(mini,/name:\s*Miniapp CI/);
assert.match(mini,/miniapp-build-and-contract:/);
assert.match(mini,/run:\s*npm run verify:miniapp/);
assert.match(mini,/run:\s*npm run test:miniapp-parity/);
assert.match(miniUpload,/verify_miniapp_qa_receipt\.mjs/);
assert.match(miniUpload,/miniapp_quality_gate\.sh/);

// Execute the real production deployer's GitHub CI decision with controlled
// workflow-run payloads. This is a failure-injection test, not a mock of the
// selection function. A failed Miniapp CI must stay red but be irrelevant to
// Web promotion; a failed Web CI must still reject the deployment.
const match=deploy.match(/python3 - "\$CI_JSON" "\$TARGET_SHA" <<'PYCI'\n([\s\S]*?)\nPYCI/);
assert.ok(match,"canonical deployer's CI decision not found");
const pythonCode=match[1];
const sha="a".repeat(40);
const web={head_sha:sha,name:"CI",path:".github/workflows/ci.yml",status:"completed",conclusion:"success"};
const miniapp={head_sha:sha,name:"Miniapp CI",path:".github/workflows/miniapp-ci.yml",status:"completed",conclusion:"failure"};
const root=mkdtempSync(join(tmpdir(),"socthink-release-ci-isolation-"));
const payload=join(root,"workflow-runs.json");
try {
  const verify=(runs)=>{
    writeFileSync(payload,JSON.stringify({workflow_runs:runs}));
    const result=spawnSync("python3",["-c",pythonCode,payload,sha],{encoding:"utf8"});
    assert.equal(result.error,undefined);
    return result.status;
  };
  assert.equal(verify([web,miniapp]),0,"Web green + Miniapp red should permit Web");
  assert.notEqual(verify([{...web,conclusion:"failure"},{...miniapp,conclusion:"success"}]),0,"Web red must reject Web");
  assert.notEqual(verify([{...miniapp,conclusion:"success"}]),0,"Miniapp green must not impersonate Web CI");
  assert.notEqual(verify([{...web,head_sha:"b".repeat(40)}]),0,"Wrong Web SHA must reject");
  assert.notEqual(verify([{...web,status:"in_progress"}]),0,"Incomplete Web CI must reject");
} finally {
  rmSync(root,{recursive:true,force:true});
}
console.log("CI_RELEASE_ISOLATION=PASS Web green + Miniapp red -> Web allowed; Web red/wrong SHA/incomplete -> denied");
console.log("PRODUCTION_RECEIPT_POLICY=PASS branch_isolated push_main_only");