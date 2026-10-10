import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const root=path.resolve(import.meta.dirname,'..')
const cli=process.env.WECHAT_DEVTOOLS_CLI || ''
const sdkPath=process.env.MINIAPP_AUTOMATOR_MODULE || ''
const projectPath=process.env.WECHAT_DEVTOOLS_PROJECT || path.join(root,'apps','miniapp')
const evidenceDir=process.env.MINIAPP_UI_EVIDENCE_DIR || path.join(root,'.release-tmp','miniapp-ui')
const sha=(process.env.MINIAPP_EXPECTED_SHA || '').trim()

if(!cli || !fs.existsSync(cli) || !sdkPath || !fs.existsSync(sdkPath)) {
  console.error('MINIAPP_DEVTOOLS_UI=BLOCKED: requires an actual Windows/macOS WeChat DevTools CLI and a separately installed miniprogram-automator SDK. This is NOT a PASS.')
  process.exit(3)
}
if(!/^[a-f0-9]{40}$/.test(sha)) { console.error('MINIAPP_DEVTOOLS_UI=BLOCKED: MINIAPP_EXPECTED_SHA must be an exact 40-character Git SHA'); process.exit(3) }
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
if(sourceSha!==sha) {
  console.error('MINIAPP_DEVTOOLS_UI=BLOCKED: expected SHA does not match tested checkout')
  process.exit(3)
}
if(!fs.existsSync(path.join(projectPath,'project.config.json'))) {
  console.error('MINIAPP_DEVTOOLS_UI=BLOCKED: project.config.json not found at declared project path')
  process.exit(3)
}
if(!fs.existsSync(path.join(projectPath,'dist','app.json'))) {
  console.error('MINIAPP_DEVTOOLS_UI=BLOCKED: first build the Taro WeChat project')
  process.exit(3)
}

const require=createRequire(import.meta.url)
const automator=require(sdkPath)
const startedAt=new Date().toISOString()
const steps=[]
const exceptionMessages=[]
fs.mkdirSync(evidenceDir,{recursive:true})

function record(name,status,details='') {
  steps.push({name,status,details,time:new Date().toISOString()})
  console.log('MINIAPP_UI_STEP',name,status,details)
}
function pathIs(page,expected) {
  return page && String(page.path||'').replace(/^\//,'')===expected
}
async function waitPage(miniProgram,possible) {
  for(let i=0;i<35;i++){
    const current=await miniProgram.currentPage()
    if(possible.some(value=>pathIs(current,value)))return current
    await new Promise(resolve=>setTimeout(resolve,300))
  }
  throw new Error('expected page not reached: '+possible.join(','))
}
async function element(page,selector) {
  await page.waitFor(selector)
  const el=await page.$(selector)
  assert.ok(el,'missing visible interactive element '+selector)
  return el
}
let miniProgram
let passed=false
try {
  miniProgram=await automator.launch({cliPath:cli,projectPath})
  miniProgram.on('exception',e=>exceptionMessages.push(String(e?.message || e).slice(0,300)))

  const home=await miniProgram.reLaunch('/pages/home/index')
  await element(home,'.hero-primary')
  await miniProgram.screenshot({path:path.join(evidenceDir,'home.png')})
  record('homepage-render','PASS')
  const homeActions=await home.$('.hero-secondary')
  assert.ok(homeActions.length>=2,'new home must offer separate mock and world-events actions')
  await homeActions[1].tap()
  const eventTab=await waitPage(miniProgram,['pages/events/index'])
  await element(eventTab,'.competition-tabs')
  await miniProgram.screenshot({path:path.join(evidenceDir,'world-events-tab.png')})
  record('homepage-to-world-events-tab-real-tap','PASS')
  const freshHome=await miniProgram.reLaunch('/pages/home/index')
  await (await element(freshHome,'.hero-primary')).tap()
  const arithmetic=await waitPage(miniProgram,['pages/arithmetic/index'])
  record('homepage-to-arithmetic-click','PASS')

  await (await element(arithmetic,'.card .primary')).tap()
  await element(arithmetic,'.question')
  await miniProgram.screenshot({path:path.join(evidenceDir,'arithmetic-first-question.png')})
  record('arithmetic-start-first-question','PASS')

  const competition=await miniProgram.reLaunch('/pages/competitions/index')
  await element(competition,'.exam-card')
  await miniProgram.screenshot({path:path.join(evidenceDir,'competitions-list.png')})
  record('competition-catalogue-loaded','PASS')
  const begin=await competition.$('.exam-card .primary')
  assert.ok(begin,'competition card has no actionable native start button')
  await begin.tap()
  const entry=await waitPage(miniProgram,['pages/login/index','pages/exam/index'])
  await miniProgram.screenshot({path:path.join(evidenceDir,'exam-entry.png')})
  record('competition-start-button-real-tap','PASS',entry.path)

  assert.equal(exceptionMessages.length,0,'WeChat runtime threw exceptions')
  passed=true
} catch(error) {
  record('fatal','FAIL',error instanceof Error?error.message:String(error))
  process.exitCode=1
} finally {
  const receipt={result:passed?'PASS':'FAIL',sha,startedAt,finishedAt:new Date().toISOString(),
    device:'WeChat DevTools simulator (not physical phone)',steps,exceptionMessages}
  fs.writeFileSync(path.join(evidenceDir,'devtools-receipt.json'),JSON.stringify(receipt,null,2))
  if(miniProgram)await miniProgram.close().catch(()=>{})
  console.log('MINIAPP_DEVTOOLS_UI='+receipt.result,'evidence='+evidenceDir)
}
