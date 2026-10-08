#!/usr/bin/env node
'use strict'
/* eslint-disable @typescript-eslint/no-require-imports -- official WeChat automator and Node CLI use CommonJS */
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {execFileSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..')
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
const output=process.env.MINIAPP_E2E_REPORT||path.join(os.tmpdir(),'kps-miniapp-e2e-report.json')
const report=(status,steps,reason='')=>{
 fs.mkdirSync(path.dirname(output),{recursive:true})
 fs.writeFileSync(output,JSON.stringify({status,sha,runAt:new Date().toISOString(),runner:'Wechat DevTools miniprogram-automator',steps,reason},null,2))
 console.log('MINIAPP_GUI_E2E='+status,reason)
}
const cliPath=process.env.WECHAT_DEVTOOLS_CLI
if(!cliPath||!fs.existsSync(cliPath)){report('BLOCKED',[],'missing official WECHAT_DEVTOOLS_CLI');process.exit(3)}
let automator
try{automator=require('miniprogram-automator')}
catch{report('BLOCKED',[],'install miniprogram-automator locally');process.exit(3)}
;(async()=>{
let app;const steps=[]
const wait=async(page,selector)=>{
 for(let n=0;n<36;n++){
  const el=await page.$(selector)
  if(el)return el
  await page.waitFor(500)
 }
 throw Error('Missing selector '+selector)
}
try{
 app=await automator.launch({cliPath,projectPath:path.join(root,'apps/miniapp')})
 const home=await app.reLaunch('/pages/home/index')
 await (await wait(home,'.hero-primary')).tap()
 await home.waitFor(900)
 let page=await app.currentPage()
 assert.equal(page.path.replace(/^\//,''),'pages/arithmetic/index')
 steps.push('homepage start -> arithmetic')
 await (await wait(page,'.primary')).tap()
 const question=await wait(page,'.question')
 assert.ok(String(await question.text()).trim().length>0)
 steps.push('arithmetic start -> question')
 page=await app.reLaunch('/pages/competitions/index')
 const paper=await wait(page,'.exam-card')
 const button=await paper.$('.primary')
 assert.ok(button,'competition list without ready paper')
 steps.push('competition nonempty + actionable')
 await button.tap()
 await page.waitFor(800)
 const exam=await app.currentPage()
 assert.equal(exam.path.replace(/^\//,''),'pages/exam/index')
 let loaded=false
 for(let n=0;n<36;n++){
  const card=await exam.$('.card')
  if(card){
   const xml=String(await card.wxml())
   if(!xml.includes('正在载入试卷') && /第.{0,12}题/.test(xml)){loaded=true;break}
  }
  await exam.waitFor(500)
 }
 assert.ok(loaded,'exam never showed question; check API/session error')
 steps.push('competition paper -> actual question')
 page=await app.reLaunch('/pages/profile/index')
 const hero=await wait(page,'.hero')
 assert.match(await hero.wxml(),/微信学习档案|游客临时体验|我的学习档案/)
 steps.push('profile shows real identity mode')
 report('PASS',steps)
}catch(e){report('FAIL',steps,e.message);process.exitCode=1}
finally{if(app)await app.close().catch(()=>{})}
})().catch(e=>{report('FAIL',[],String(e));process.exitCode=1})
