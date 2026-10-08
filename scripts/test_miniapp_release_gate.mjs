import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

const sha='3fc13dc06c97d77dbca7c93cdfbd818bec085e2b'
const root=path.resolve(import.meta.dirname,'..')
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'socthink-upload-qa-'))
const script=path.join(root,'scripts','verify_miniapp_qa_receipt.mjs')
const devsteps=[
  'homepage-render','homepage-to-arithmetic-click','arithmetic-start-first-question',
  'competition-catalogue-loaded','competition-start-button-real-tap',
]
const mobileSteps=[
  'wechat-cold-start','arithmetic-first-question','competition-login-gate',
  'exam-answer-submit-review','network-failure-retry',
]
function invoke(file,commit=sha){
  return spawnSync(process.execPath,[script,file,commit],{encoding:'utf8',timeout:10000})
}
try {
  assert.equal(invoke(path.join(temp,'missing.json')).status,3)
  const image=['home.png','arithmetic-first-question.png','competitions-list.png','exam-entry.png',
    'phone-home.png','phone-exam.png','phone-review.png']
  // These are dummy file fixtures for schema checks only, never a real QA receipt.
  for(const f of image){const buf=Buffer.alloc(200,0x42);Buffer.from('89504e470d0a1a0a','hex').copy(buf);fs.writeFileSync(path.join(temp,f),buf)}
  const devtools={result:'PASS',sha,device:'WeChat DevTools simulator',
    steps:devsteps.map(name=>({name,status:'PASS'})),exceptionMessages:[]}
  fs.writeFileSync(path.join(temp,'devtools-receipt.json'),JSON.stringify(devtools))
  const receipt={result:'PASS',commitSha:sha,testedAt:new Date().toISOString(),
    devtools:{receiptFile:'devtools-receipt.json'},
    android:{result:'PASS',model:'QA Android',wechatVersion:'8.0.78',
      deviceType:'physical-android',steps:mobileSteps.map(name=>({name,status:'PASS'})),
      screenshots:['phone-home.png','phone-exam.png','phone-review.png']}}
  const file=path.join(temp,'release.json')
  fs.writeFileSync(file,JSON.stringify(receipt))
  const valid=invoke(file)
  assert.equal(valid.status,0,'correct receipt schema must be accepted: '+valid.stderr)
  assert.match(valid.stdout,/MINIAPP_RELEASE_QA=PASS/)
  assert.equal(invoke(file,sha.slice(1)+'b').status,3,'wrong commit SHA must fail')
  receipt.android.steps=receipt.android.steps.slice(1)
  fs.writeFileSync(file,JSON.stringify(receipt))
  assert.equal(invoke(file).status,3,'incomplete phone tests must fail')
  receipt.android.steps=mobileSteps.map(name=>({name,status:'PASS'}))
  receipt.testedAt='2020-01-01T00:00:00Z'
  fs.writeFileSync(file,JSON.stringify(receipt))
  assert.equal(invoke(file).status,3,'stale receipt must fail')
  console.log('MINIAPP_RELEASE_GATE_SCHEMA=PASS missing=blocked sha_mismatch=blocked missing_android_step=blocked expired=blocked')
} finally {
  fs.rmSync(temp,{recursive:true,force:true})
}
