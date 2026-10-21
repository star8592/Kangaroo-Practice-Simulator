'use strict'

// Verifies actual post-Taro build artifacts, not merely mocked fixtures.
// This is static validation; it does not claim WeChat AI permission or real-device Handoff.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function verifyCanary(outputRoot) {
  const dist = path.resolve(outputRoot)
  assert.equal(path.basename(dist), 'dist', 'must target explicit Taro dist')
  const readJson = file => JSON.parse(fs.readFileSync(path.join(dist, file), 'utf8'))
  const app = readJson('app.json')
  const meta = readJson('page-meta.json')
  const skill = readJson('skills/math-discovery/mcp.json')
  assert.deepEqual(
    app.agent?.skills?.map(x => x.path),
    ['skills/math-discovery'],
    'agent must discover exactly one isolated Skill'
  )
  assert.ok(
    app.subPackages?.some(x => x.root === 'skills' && x.independent === true),
    'Skills package must be independent'
  )
  assert.equal(app.agent.pageMetadata, 'page-meta.json')
  assert.equal(app.lazyCodeLoading, 'requiredComponents', 'AI runtime requires lazy code loading')
  const project = readJson('project.config.json')
  assert.equal(project.miniprogramRoot, './')
  assert.ok(project.packOptions?.include?.some(x => x.type === 'folder' && x.value === 'skills'),
    'Skill must be included in standalone IDE project packaging')
  assert.ok(app.subPackages.some(x => x.root === 'skills' && x.name === 'skills' && x.independent === true))
  const bundledEntry = fs.readFileSync(path.join(dist, 'skills/math-discovery/index.js'), 'utf8')
  assert.ok(bundledEntry.includes('createSkill(') && bundledEntry.includes('registerAPI('),
    'the runtime Skill entry must contain registered APIs')
  assert.ok(!bundledEntry.includes("require('./apis/") && !bundledEntry.includes('require("./apis/'),
    'raw relative CommonJS imports cause WeChat runtime module-not-defined errors')
  assert.deepEqual(
    skill.apis.map(x => x.name),
    ['prepareArithmeticTraining', 'findInternationalCompetitions']
  )
  const targets = ['/pages/arithmetic/index', '/pages/events/index', '/pages/ai-entry/index']
  for (const target of targets) {
    const relative = target.slice(1)
    assert.ok(app.pages.includes(relative), 'missing Taro registered page: ' + target)
    if (target === '/pages/ai-entry/index') {
      assert.ok(meta.pages.some(x => x.path === relative), 'missing AI landing page metadata')
    }
    assert.ok(fs.existsSync(path.join(dist, relative + '.js')), 'missing JS page: ' + target)
    assert.ok(fs.existsSync(path.join(dist, relative + '.wxml')), 'missing WXML page: ' + target)
  }
  for (const api of skill.apis) {
    assert.equal(api._meta?.ui?.pagePath, '/pages/ai-entry/index', 'handoff must use non-TabBar landing page')
  }
  for (const file of [
    'skills/math-discovery/index.js',
    'skills/math-discovery/SKILL.md',
    'skills/math-discovery/apis/prepareArithmeticTraining.js',
    'skills/math-discovery/apis/findInternationalCompetitions.js'
  ]) assert.ok(fs.existsSync(path.join(dist, file)), 'missing independent Skill asset: ' + file)
  return { skillCount: app.agent.skills.length, apiCount: skill.apis.length, targetCount: targets.length }
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('usage: node verify-canary.cjs apps/miniapp/dist')
    const result = verifyCanary(process.argv[2])
    console.log('WECHAT_AI_COMPILED_CANARY=PASS ' + JSON.stringify(result))
    console.log('WECHAT_AI_REAL_HANDOFF=NOT_TESTED; WECHAT_PLATFORM_APPROVAL=NOT_VERIFIED')
  } catch (error) {
    console.error('WECHAT_AI_COMPILED_CANARY=FAIL ' + error.message)
    process.exitCode = 1
  }
}
module.exports = { verifyCanary }
