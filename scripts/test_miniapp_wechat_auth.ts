import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/auth/miniapp/wechat/route';
import { userFromSessionToken } from '../src/lib/auth';

async function main() {
  const originalFetch = globalThis.fetch;
  const oldId = process.env.WECHAT_MINIAPP_APPID;
  const oldSecret = process.env.WECHAT_MINIAPP_SECRET;
  try {
    delete process.env.WECHAT_MINIAPP_APPID;
    delete process.env.WECHAT_MINIAPP_SECRET;
    const unavailable = await POST(new NextRequest('http://localhost/api/auth/miniapp/wechat', {method:'POST',body:JSON.stringify({code:'validcode123'})}));
    assert.equal(unavailable.status,503);
    process.env.WECHAT_MINIAPP_APPID='testappid';
    process.env.WECHAT_MINIAPP_SECRET='testsecret';
    let count=0;
    globalThis.fetch=async (input) => {
      const url = new URL(String(input));
      assert.equal(url.hostname,'api.weixin.qq.com');
      assert.equal(url.pathname,'/sns/jscode2session');
      assert.equal(url.searchParams.get('appid'),'testappid');
      count++;
      return new Response(JSON.stringify({openid:'same-wechat-openid'}),{status:200});
    };
    const make=()=>new NextRequest('http://localhost/api/auth/miniapp/wechat',{method:'POST',body:JSON.stringify({code:'validcode123'})});
    const first=await POST(make());const second=await POST(make());
    assert.equal(first.status,200);assert.equal(second.status,200);
    const a=await first.json();const b=await second.json();
    assert.equal(a.user.id,b.user.id);
    assert.equal(a.user.username,'wechat');
    assert.equal(userFromSessionToken(a.accessToken)?.id,a.user.id);
    assert.equal(count,2);
    const invalid=await POST(new NextRequest('http://localhost/api/auth/miniapp/wechat',{method:'POST',body:JSON.stringify({code:'bad'})}));
    assert.equal(invalid.status,400);
    console.log('MINIAPP_WECHAT_SILENT_LOGIN=PASS');
  } finally {
    globalThis.fetch=originalFetch;
    if(oldId===undefined)delete process.env.WECHAT_MINIAPP_APPID;else process.env.WECHAT_MINIAPP_APPID=oldId;
    if(oldSecret===undefined)delete process.env.WECHAT_MINIAPP_SECRET;else process.env.WECHAT_MINIAPP_SECRET=oldSecret;
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
