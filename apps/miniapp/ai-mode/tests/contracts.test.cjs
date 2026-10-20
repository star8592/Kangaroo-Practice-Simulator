'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { readFileSync } = require('node:fs')
const base = path.resolve(__dirname, '..')
const train = require('../skills/math-discovery/apis/prepareArithmeticTraining.js')
const events = require('../skills/math-discovery/apis/findInternationalCompetitions.js')
const mcp = JSON.parse(readFileSync(path.join(base, 'skills/math-discovery/mcp.json'), 'utf8'))

test('R0 interface declarations and real TabBar destination names match', () => {
  assert.deepEqual(mcp.apis.map(api => api.name), ['prepareArithmeticTraining', 'findInternationalCompetitions'])
  const cfg = readFileSync(path.resolve(base, '../src/app.config.ts'), 'utf8')
  for (const api of mcp.apis) assert.equal(api._meta.ui.pagePath,'/pages/ai-entry/index')
  assert.ok(cfg.includes('pages/ai-entry/index'))
})

test('arithmetic requires a valid stated grade and never starts an activity', async () => {
  for (const bad of [0, 13, 2.5, '2', null]) assert.equal((await train({grade: bad})).isError, true)
  const unknown = await train({})
  assert.equal(unknown.structuredContent.suggestedGrade, null)
  assert.equal(unknown.structuredContent.started, false)
  assert.deepEqual(unknown.handoff, {query: 'mode=arithmetic'})
  const grade2 = await train({grade: 2})
  assert.equal(grade2.structuredContent.suggestedGrade, 2)
  assert.equal(grade2.structuredContent.requiresInAppConfirmation, true)
  assert.deepEqual(grade2.handoff, {query: 'mode=arithmetic&grade=2'})
})

test('international event lookup uses one public API and excludes domestic/private fields', async () => {
  const calls = []
  global.wx = {request: opts => {
    calls.push(opts)
    opts.success({statusCode:200,data:{entries:[
      {event:{id:'kangaroo',nameZh:'袋鼠数学',region:'global',summaryZh:'全球赛事',sourceUrl:'https://example.org/kangaroo'},progress:{completedTaskIds:['secret']},following:true},
      {event:{id:'hope-cup',nameZh:'希望杯',region:'CN',summaryZh:'国内赛事',sourceUrl:'https://example.org/hope'}},
      {event:{id:'hope-cup-2',nameZh:'国内赛事二',region:'cn',summaryZh:'国内赛事',sourceUrl:'https://example.org/hope2'}},
      {event:{id:'australian-amc',nameZh:'澳洲 AMC',region:'AU',summaryZh:'澳洲数学竞赛',sourceUrl:'https://example.org/amc'}}
    ]}})
  }}
  const all = await events({})
  assert.equal(all.isError,false)
  assert.equal(all.structuredContent.total,2)
  assert.ok(all.structuredContent.items.every(x => x.region !== 'CN'))
  assert.ok(all.structuredContent.items.every(x => !('progress' in x) && !('following' in x)))
  assert.equal(calls.length,1)
  assert.equal(calls[0].url,'https://socthink.cn/api/miniapp/world-competitions')
  assert.equal(calls[0].header,undefined)
  const au = await events({region:'AU'})
  assert.equal(au.structuredContent.items[0].nameZh,'澳洲 AMC')
  assert.equal(au.structuredContent.total,1)
  assert.deepEqual(au.handoff,{query:'mode=events&eventId=australian-amc'})
  delete global.wx
})

test('invalid inputs and failures cannot invent matches', async () => {
  assert.equal((await events({region:'CN'})).isError,true)
  assert.equal((await events({keyword:'x'.repeat(81)})).isError,true)
  global.wx = {request: opts => opts.fail({})}
  const result = await events({keyword:'SEAMO'})
  assert.equal(result.isError,true)
  assert.equal(result.structuredContent,undefined)
  delete global.wx
})
