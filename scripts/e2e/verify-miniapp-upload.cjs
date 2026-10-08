#!/usr/bin/env node
'use strict'
// Fail closed for upload. Preview remains allowed for actual WeChat testing.
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..')
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
function readReport(file,kind) {
 if(!file||!fs.existsSync(file))throw Error(kind+' acceptance evidence is missing')
 const data=JSON.parse(fs.readFileSync(file,'utf8'))
 if(data.status!=='PASS'||data.sha!==sha)throw Error(kind+' report is not PASS for '+sha.slice(0,8))
 const at=Date.parse(data.runAt)
 if(!Number.isFinite(at)||at>Date.now()+60000||Date.now()-at>24*3600*1000)throw Error(kind+' report is stale')
 return data
}
try{
 const gui=readReport(process.env.MINIAPP_E2E_REPORT||path.join(os.tmpdir(),'kps-miniapp-e2e-report.json'),'WeChat DevTools click E2E')
 if(!Array.isArray(gui.steps)||gui.steps.length<5)throw Error('click E2E paths incomplete')
 const phone=readReport(process.env.MINIAPP_REAL_DEVICE_REPORT,'real-phone WeChat E2E')
 if(!phone.deviceModel||!phone.wechatVersion||!Array.isArray(phone.evidence)||phone.evidence.length<2) {
  throw Error('real-phone model/version/evidence incomplete')
 }
 console.log('MINIAPP_UPLOAD_GATE=PASS sha='+sha.slice(0,12))
}catch(e){
 console.error('MINIAPP_UPLOAD_GATE=BLOCKED '+e.message)
 process.exitCode=3
}
