import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const [receiptPath,expectedSha]=process.argv.slice(2)
const shaPattern=/^[a-f0-9]{40}$/
const requiredDevtools=[
  'homepage-render','homepage-to-arithmetic-click','arithmetic-start-first-question',
  'competition-catalogue-loaded','competition-start-button-real-tap',
]
const requiredAndroid=[
  'wechat-cold-start','arithmetic-first-question','competition-login-gate',
  'exam-answer-submit-review','network-failure-retry',
]

function block(message) {
  console.error('MINIAPP_RELEASE_QA=BLOCKED reason='+message)
  process.exit(3)
}
function evidenceFile(file,base) {
  assert.ok(typeof file==='string' && file && !file.includes('\0'))
  const absolute=path.resolve(base,file)
  const stat=fs.statSync(absolute)
  assert.ok(stat.isFile() && stat.size>=100,'missing or empty evidence: '+file)
  const ext=path.extname(absolute).toLowerCase()
  assert.match(ext,/^\.(png|jpe?g)$/,'evidence must be screenshot')
  const magic=fs.readFileSync(absolute).subarray(0,8)
  if(ext==='.png')assert.equal(magic.toString('hex'),'89504e470d0a1a0a','invalid PNG evidence')
  else assert.equal(magic.subarray(0,3).toString('hex'),'ffd8ff','invalid JPEG evidence')
}
try {
  if(!shaPattern.test(expectedSha||''))block('missing_exact_git_sha')
  if(!receiptPath || !fs.existsSync(receiptPath))block('missing_native_device_receipt')

  const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'))
  const parent=path.dirname(path.resolve(receiptPath))
  assert.equal(receipt.commitSha,expectedSha,'receipt does not match upload SHA')
  assert.equal(receipt.result,'PASS')
  const testedAt=Date.parse(receipt.testedAt||'')
  assert.ok(Number.isFinite(testedAt))
  assert.ok(testedAt<=Date.now()+5*60_000 && Date.now()-testedAt<=72*3_600_000,
    'QA receipt must be recent and cannot be dated in the future')

  assert.ok(typeof receipt.devtools?.receiptFile==='string')
  const devtoolsPath=path.resolve(parent,receipt.devtools.receiptFile)
  const devtools=JSON.parse(fs.readFileSync(devtoolsPath,'utf8'))
  assert.equal(devtools.result,'PASS')
  assert.equal(devtools.sha,expectedSha)
  assert.deepEqual(devtools.exceptionMessages||[],[],'WeChat runtime exceptions present')
  assert.ok(String(devtools.device||'').includes('WeChat DevTools'))
  for(const name of requiredDevtools) {
    assert.ok(devtools.steps?.some(s=>s.name===name && s.status==='PASS'),
      'DevTools action missing: '+name)
  }
  const devtoolsDir=path.dirname(devtoolsPath)
  for(const image of ['home.png','arithmetic-first-question.png','competitions-list.png','exam-entry.png']) {
    evidenceFile(image,devtoolsDir)
  }

  const android=receipt.android
  assert.equal(android.result,'PASS')
  assert.ok(typeof android.model==='string' && android.model.length>=4)
  assert.ok(typeof android.wechatVersion==='string' && android.wechatVersion.length>=4)
  assert.ok(android.deviceType==='physical-android','must be a physical Android test, not a simulator')
  for(const name of requiredAndroid){
    assert.ok(android.steps?.some(s=>s.name===name&&s.status==='PASS'),
      'Android interaction missing: '+name)
  }
  assert.ok(Array.isArray(android.screenshots) && android.screenshots.length>=3)
  android.screenshots.forEach(s=>evidenceFile(s,parent))
  console.log('MINIAPP_RELEASE_QA=PASS sha='+expectedSha+
    ' devtools_actions='+requiredDevtools.length+' android_actions='+requiredAndroid.length)
} catch(error) {
  block(error instanceof Error?error.message.replace(/\s+/g,' ').slice(0,250):'malformed_receipt')
}
