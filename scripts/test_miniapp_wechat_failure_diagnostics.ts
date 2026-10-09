import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { POST } from '../src/app/api/auth/miniapp/wechat/route'
import { classifyWechatCode2SessionError } from '../src/lib/wechat-miniapp-failure'

const classes: Array<{code:number;status:number;reason:string}>= [
  {code:40029,status:401,reason:'invalid_one_time_code'},
  {code:40163,status:401,reason:'invalid_one_time_code'},
  {code:40125,status:503,reason:'wechat_configuration'},
  {code:40164,status:503,reason:'wechat_ip_whitelist'},
  {code:45011,status:429,reason:'wechat_rate_limit'},
  {code:-1,status:503,reason:'wechat_busy'},
  {code:99997,status:502,reason:'wechat_unknown_error'},
]
async function run() {
  const originalFetch=globalThis.fetch
  const originalWarn=console.warn
  const oldId=process.env.WECHAT_MINIAPP_APPID
  const oldSecret=process.env.WECHAT_MINIAPP_SECRET
  const logs:string[]=[]
  try {
    process.env.WECHAT_MINIAPP_APPID='wx0000000000000000'
    process.env.WECHAT_MINIAPP_SECRET='not_the_real_secret_1234'
    console.warn=(...args)=>{logs.push(args.map(String).join(' '))}
    const make=()=>new NextRequest('http://localhost/api/auth/miniapp/wechat',{
      method:'POST',body:JSON.stringify({code:'testwxcode123456'})
    })
    for (const expected of classes) {
      globalThis.fetch=async()=>new Response(JSON.stringify({
        errcode:expected.code, errmsg:'secret_token=NEVER_LOG_OPENID=test-private'
      }),{status:200})
      const result=await POST(make())
      const parsed=await result.json()
      assert.equal(result.status,expected.status,'HTTP status for '+expected.code)
      assert.equal(parsed.reason,expected.reason,'reason for '+expected.code)
      assert.ok(parsed.error.length)
      assert.equal(parsed.accessToken,undefined)
      assert.equal(parsed.openid,undefined)
      assert.equal(classifyWechatCode2SessionError(expected.code).reason,expected.reason)
    }
    globalThis.fetch=async()=>new Response('error',{status:500})
    assert.equal((await POST(make())).status,502)
    globalThis.fetch=async()=>{ throw Error('private-token-and-secret-must-not-leak') }
    assert.equal((await POST(make())).status,502)
    const allLogs=logs.join('\n')
    assert.ok(logs.length>=classes.length)
    assert.doesNotMatch(allLogs,/testwxcode|not_the_real_secret|NEVER_LOG_OPENID|private-token-and-secret/)
    assert.match(allLogs,/miniapp_wechat_code2session_rejected/)
    console.warn=originalWarn
    console.log('MINIAPP_WECHAT_FAILURE_DIAGNOSTICS=PASS error_categories='+classes.length+' no_secrets_logged=true')
  } finally {
    globalThis.fetch=originalFetch
    console.warn=originalWarn
    if(oldId===undefined)delete process.env.WECHAT_MINIAPP_APPID
    else process.env.WECHAT_MINIAPP_APPID=oldId
    if(oldSecret===undefined)delete process.env.WECHAT_MINIAPP_SECRET
    else process.env.WECHAT_MINIAPP_SECRET=oldSecret
  }
}
run().catch(e=>{console.error(e);process.exitCode=1})
