#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const command = process.argv[2] || 'status'
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'apps/miniapp/project.config.json'), 'utf8'))
const appid = process.env.WECHAT_MINIAPP_APPID || appConfig.appid
const secret = process.env.WECHAT_MINIAPP_SECRET

if (process.env.WECHAT_MINIAPP_APPID && process.env.WECHAT_MINIAPP_APPID !== appConfig.appid) {
  console.error('MINIAPP_OPENAPI=FAIL reason=appid_mismatch_with_project')
  process.exit(2)
}

if (!/^wx[A-Za-z0-9]{16}$/.test(String(appid || ''))) {
  console.error('MINIAPP_OPENAPI=FAIL reason=invalid_appid')
  process.exit(2)
}
if (!secret) {
  console.error('MINIAPP_OPENAPI=BLOCKED reason=missing_secret')
  process.exit(3)
}

async function wxJson(url, options = {}) {
  const response = await fetch(url, options)
  const body = await response.json()
  return body
}

async function getToken() {
  const body = await wxJson('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      grant_type: 'client_credential',
      appid,
      secret,
      force_refresh: false
    })
  })
  if (!body.access_token) {
    const ip = /invalid ip ([^ ]+)/.exec(String(body.errmsg || ''))?.[1]
    if (Number(body.errcode) === 40164) {
      console.error(`MINIAPP_OPENAPI=BLOCKED reason=ip_whitelist${ip ? ` ip=${ip}` : ''}`)
    } else {
      console.error(`MINIAPP_OPENAPI=FAIL stage=token errcode=${body.errcode ?? 'unknown'} errmsg=${String(body.errmsg || '').slice(0, 180)}`)
    }
    process.exit(4)
  }
  return body.access_token
}

async function api(token, endpoint, data = undefined) {
  const url = `https://api.weixin.qq.com${endpoint}?access_token=${encodeURIComponent(token)}`
  const options = data === undefined ? {} : {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(data)
  }
  return wxJson(url, options)
}

function fail(stage, x) {
  console.error(`MINIAPP_OPENAPI=FAIL stage=${stage} errcode=${x?.errcode ?? 'unknown'} errmsg=${String(x?.errmsg || '').slice(0, 200)}`)
  process.exit(5)
}

function categoryScore(c) {
  const text = [c.first_class, c.second_class, c.third_class, c.first, c.second, c.third].filter(Boolean).join(' ')
  let score = 0
  if (/教育|学习|培训|题库|考试/.test(text)) score += 100
  if (/在线教育|教育信息服务|学历教育|素质教育/.test(text)) score += 50
  return score
}

function normalizeCategory(c) {
  return {
    first_class: c.first_class ?? c.first,
    second_class: c.second_class ?? c.second,
    third_class: c.third_class ?? c.third,
    first_id: c.first_id,
    second_id: c.second_id,
    third_id: c.third_id
  }
}

async function status(token) {
  const [version, audit] = await Promise.all([
    api(token, '/wxa/getversioninfo'),
    api(token, '/wxa/get_latest_auditstatus')
  ])
  const out = {
    version: {
      errcode: version.errcode,
      errmsg: version.errmsg,
      exp_info: version.exp_info ?? null,
      release_info: version.release_info ?? null
    },
    audit: {
      errcode: audit.errcode,
      errmsg: audit.errmsg,
      auditid: audit.auditid ?? null,
      status: audit.status ?? null,
      reason: audit.reason ?? null,
      screenShot: undefined
    }
  }
  console.log(JSON.stringify(out, null, 2))
  return {version, audit}
}

async function domainStatus(token) {
  // This operation is read-only; add/delete/set are deliberately unsupported.
  const result = await api(token, '/wxa/modify_domain', {action:'get'})
  if (Number(result?.errcode || 0) !== 0) {
    console.error('MINIAPP_DOMAIN=BLOCKED reason=wechat_api_unavailable errcode='+
      String(result?.errcode ?? 'unknown'))
    process.exitCode = 6
    return
  }
  const request = Array.isArray(result.requestdomain) ? result.requestdomain : []
  const expected = 'https://socthink.cn'
  const configured = request.includes(expected)
  console.log('MINIAPP_DOMAIN_REQUEST='+JSON.stringify(request))
  console.log('MINIAPP_DOMAIN_REQUIRED='+expected+' present='+configured)
  if (!configured) {
    console.error('MINIAPP_DOMAIN=BLOCKED reason=request_domain_missing')
    process.exitCode = 7
  } else {
    console.log('MINIAPP_DOMAIN=PASS')
  }
}

async function submit(token) {
  const latest = await api(token, '/wxa/get_latest_auditstatus')
  if (latest?.errcode === 0 && Number(latest.status) === 2) {
    console.log(`MINIAPP_AUDIT=SKIP reason=already_pending auditid=${latest.auditid}`)
    return
  }

  const categories = await api(token, '/wxa/get_category')
  if (categories.errcode && categories.errcode !== 0) fail('get_category', categories)
  const rawCategories = categories.category_list || categories.categories || []
  if (!rawCategories.length) {
    console.error('MINIAPP_OPENAPI=BLOCKED reason=no_category')
    process.exit(6)
  }
  const category = [...rawCategories].sort((a,b) => categoryScore(b) - categoryScore(a))[0]

  const pages = await api(token, '/wxa/get_page')
  if (pages.errcode && pages.errcode !== 0) fail('get_page', pages)
  const pageList = pages.page_list || pages.pages || []
  const preferred = ['pages/home/index', 'pages/arithmetic/index', 'pages/competitions/index']
  const address = preferred.find(x => pageList.includes(x)) || pageList[0] || 'pages/home/index'

  const payload = {
    item_list: [{
      address,
      tag: '数学 计算 竞赛 学习',
      ...normalizeCategory(category),
      title: '数学训练与竞赛'
    }]
  }
  Object.keys(payload.item_list[0]).forEach(k => payload.item_list[0][k] == null && delete payload.item_list[0][k])

  const result = await api(token, '/wxa/submit_audit', payload)
  if (result.errcode && result.errcode !== 0) fail('submit_audit', result)
  console.log(`MINIAPP_AUDIT=SUBMITTED auditid=${result.auditid ?? 'unknown'} page=${address}`)
}

async function release(token) {
  const audit = await api(token, '/wxa/get_latest_auditstatus')
  if (audit.errcode && audit.errcode !== 0) fail('get_latest_auditstatus', audit)
  if (Number(audit.status) !== 0) {
    console.error(`MINIAPP_RELEASE=BLOCKED reason=audit_not_passed status=${audit.status ?? 'unknown'} auditid=${audit.auditid ?? 'unknown'}`)
    process.exit(7)
  }
  const result = await api(token, '/wxa/release', {})
  if (result.errcode && result.errcode !== 0) fail('release', result)
  console.log(`MINIAPP_RELEASE=PASS auditid=${audit.auditid ?? 'unknown'}`)
}

const token = await getToken()
if (command === 'status') await status(token)
else if (command === 'domain-status') await domainStatus(token)
else if (command === 'submit') await submit(token)
else if (command === 'release') await release(token)
else {
  console.error('usage: node ops/release/miniapp_openapi.mjs status|domain-status|submit|release')
  process.exit(2)
}
