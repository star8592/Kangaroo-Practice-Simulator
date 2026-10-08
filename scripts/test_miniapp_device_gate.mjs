import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)))
const env={...process.env}
delete env.WECHAT_DEVTOOLS_CLI
delete env.MINIAPP_AUTOMATOR_MODULE
delete env.MINIAPP_EXPECTED_SHA
const result=spawnSync(process.execPath,['scripts/miniapp_devtools_e2e.mjs'],{cwd:root,env,encoding:'utf8',timeout:12000})
assert.equal(result.status,3,'without actual WeChat DevTools, device E2E must not report success')
assert.match(result.stderr,/MINIAPP_DEVTOOLS_UI=BLOCKED/)
assert.doesNotMatch(result.stdout,/MINIAPP_DEVTOOLS_UI=PASS/)
console.log('MINIAPP_DEVICE_GATE_FAIL_CLOSED=PASS block_code=3')
