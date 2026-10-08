#!/usr/bin/env node
'use strict'
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {spawnSync}=require('node:child_process')
const dir=__dirname
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kps-miniapp-gate-test-'))
const env={...process.env,WECHAT_DEVTOOLS_CLI:'',MINIAPP_E2E_REPORT:path.join(tmp,'click.json'),MINIAPP_REAL_DEVICE_REPORT:path.join(tmp,'phone.json')}
try{
 let result=spawnSync(process.execPath,[path.join(dir,'miniapp-click-smoke.cjs')],{env,encoding:'utf8'})
 assert.equal(result.status,3,'GUI automation without DevTools must be BLOCKED')
 let report=JSON.parse(fs.readFileSync(env.MINIAPP_E2E_REPORT,'utf8'))
 assert.equal(report.status,'BLOCKED')
 result=spawnSync(process.execPath,[path.join(dir,'verify-miniapp-upload.cjs')],{env,encoding:'utf8'})
 assert.equal(result.status,3,'upload without real evidence must be BLOCKED')
 assert.match(result.stderr,/BLOCKED/)
 console.log('MINIAPP_FAIL_CLOSED_CONTRACT=PASS')
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
