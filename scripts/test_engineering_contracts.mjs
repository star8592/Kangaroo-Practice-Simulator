import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("critical exam routes use the shared server-side authorization guard",()=>{
  const routes=[
    ["src/app/exam/[examId]/page.tsx",1],
    ["src/app/api/exams/[examId]/route.ts",1],
    ["src/app/api/exam-sessions/route.ts",3],
    ["src/app/api/grade/route.ts",1],
  ];
  for(const [path,minCalls] of routes){
    const source=read(path);
    const count=(source.match(/if\s*\(\s*!hasFullExamAccess\s*\(/g)||[]).length;
    assert.ok(count>=minCalls,path+": full exam guard missing on one or more paths");
  }
  const guest=read("src/app/api/auth/guest/start/route.ts");
  assert.match(guest,/target\.startsWith\("\/exam\/"\)/);
});
test("release wiring includes candidate, active, public receipt and daily watchdog",()=>{
  const build=read("ops/release/build_prebuilt_runtime.sh");
  assert.match(build,/cp scripts\/smoke_exam_access_live\.mjs/,"immutable runtime must include the deployed live guard");
  const release=read("ops/release/auto_deploy_server.sh");
  const count=(release.match(/smoke_exam_access_live\.mjs/g)||[]).length;
  assert.ok(count>=2,"candidate and promoted runtime must both run live guard");
  const receipt=read(".github/workflows/production-receipt.yml");
  assert.match(receipt,/smoke_exam_access_live\.mjs/);
  const watchdog=read(".github/workflows/miniapp-production-smoke.yml");
  assert.match(watchdog,/test:exam-access-live/);
  const gate=read("ops/automation/quality_gate.sh");
  assert.match(gate,/test:exam-access-live-contract/);
  assert.match(gate,/test:exam-access/);
});
test("main CI independently checks browser clicks and native miniapp build",()=>{
  const workflow=read(".github/workflows/ci.yml");
  assert.match(workflow,/name: Web browser click E2E/);
  assert.match(workflow,/test:e2e:smoke/);
  assert.match(workflow,/E2E_ALLOW_SYNTHETIC_FIXTURE/);
  assert.match(workflow,/name: Miniapp build and API contracts/);
  assert.match(workflow,/verify:miniapp/);
});
