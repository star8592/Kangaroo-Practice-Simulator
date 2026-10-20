'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {packCanary} = require('../pack-canary.cjs')

function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kps-ai-r0-'))
  const dist = path.join(root, 'dist')
  fs.mkdirSync(dist)
  fs.writeFileSync(path.join(dist, 'app.js'), '/* mocked Taro output */')
  fs.writeFileSync(path.join(dist, 'app.json'), JSON.stringify({
    pages:['pages/home/index','pages/arithmetic/index','pages/events/index']
  }))
  try { return fn(dist) }
  finally { fs.rmSync(root, {recursive:true,force:true}) }
}

test('isolated canary packer adds independent Skill to built dist only', () => fixture(dist => {
  const result = packCanary(dist)
  assert.equal(result.count, 2)
  const app = JSON.parse(fs.readFileSync(path.join(dist, 'app.json')))
  assert.equal(app.agent.skills[0].path, 'skills/math-discovery')
  assert.deepEqual(app.subPackages[0], {root:'skills',pages:[],independent:true})
  assert.ok(fs.existsSync(path.join(dist,'skills/math-discovery/mcp.json')))
  assert.ok(fs.existsSync(path.join(dist,'page-meta.json')))
  assert.throws(() => packCanary(dist), /已有 AI 能力声明/)
}))

test('rejects wrong build and missing target page before mutation', () => fixture(dist => {
  const cfg = path.join(dist, 'app.json')
  fs.writeFileSync(cfg, JSON.stringify({pages:['pages/home/index']}))
  assert.throws(() => packCanary(dist), /缺少目标页面/)
  assert.equal(fs.existsSync(path.join(dist, 'skills')),false)
}))

test('rejects broad or ambiguous output target', () => {
  assert.throws(() => packCanary('/tmp'), /dist 目录/)
})
