import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const run=(env)=>spawnSync(process.execPath,['ops/release/miniapp_openapi.mjs','domain-status'],{
  cwd:root,env:{...process.env,WECHAT_MINIAPP_APPID:'',WECHAT_MINIAPP_SECRET:'',...env},encoding:'utf8'
})
test('mismatched miniapp AppID must fail before any WeChat request',()=>{
  const r=run({WECHAT_MINIAPP_APPID:'wx1111111111111111',WECHAT_MINIAPP_SECRET:'not-a-real-secret'})
  assert.equal(r.status,2)
  assert.match(r.stderr,/appid_mismatch_with_project/)
})
test('domain status without secret is blocked, never bypassed',()=>{
  const r=run({})
  assert.equal(r.status,3)
  assert.match(r.stderr,/missing_secret/)
})
test('domain query cannot include domain mutations',()=>{
  const src=readFileSync(path.join(root,'ops/release/miniapp_openapi.mjs'),'utf8')
  const block=src.split('async function domainStatus(token) {')[1]?.split('async function submit(token) {')[0]
  assert.ok(block,'domain status function exists')
  assert.match(block,/action:'get'/)
  assert.doesNotMatch(block,/action:'(?:set|add|delete)'/)
})
