'use strict'

// Explicit opt-in packaging after "taro build --type weapp".
// It never alters src/app.config.ts, any backend, or production release settings.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { bundleSkillEntry } = require('./bundle-skill-entry.cjs')

function packCanary(outputRoot, { bundleEntry = bundleSkillEntry } = {}) {
  const dist = path.resolve(outputRoot)
  if (path.basename(dist) !== 'dist') throw new Error('只允许装配到明确指定的 dist 目录')
  const appPath = path.join(dist, 'app.json')
  const runtimePath = path.join(dist, 'app.js')
  if (!fs.existsSync(appPath) || !fs.existsSync(runtimePath)) {
    throw new Error('请先完成 Taro weapp 构建；找不到 dist/app.json 或 dist/app.js')
  }

  const app = JSON.parse(fs.readFileSync(appPath, 'utf8'))
  if (!Array.isArray(app.pages) ||
    !app.pages.includes('pages/arithmetic/index') ||
    !app.pages.includes('pages/events/index') ||
    !app.pages.includes('pages/ai-entry/index')) {
    throw new Error('构建产物缺少目标页面，禁止装配不兼容版本')
  }
  if (app.agent || (app.subPackages || []).some(x => x.root === 'skills')) {
    throw new Error('dist 已有 AI 能力声明或 skills 分包，请使用全新构建')
  }

  const skillRoot = path.join(__dirname, 'skills', 'math-discovery')
  const dest = path.join(dist, 'skills', 'math-discovery')
  if (fs.existsSync(dest)) throw new Error('目标 Skill 已存在，请使用全新 dist')
  for (const name of ['index.js', 'SKILL.md', 'mcp.json', 'apis/prepareArithmeticTraining.js', 'apis/findInternationalCompetitions.js']) {
    if (!fs.existsSync(path.join(skillRoot, name))) throw new Error('缺少 Skill 文件：' + name)
  }
  const declared = JSON.parse(fs.readFileSync(path.join(skillRoot, 'mcp.json'), 'utf8'))
  if (!Array.isArray(declared.apis) || declared.apis.length !== 2) throw new Error('Skill API 契约不符合 R0')
  for (const item of declared.apis) {
    if (!app.pages.includes(item._meta && item._meta.ui && item._meta.ui.pagePath.replace(/^\//, ''))) {
      throw new Error('Skill pagePath 未在正式页面表中注册')
    }
  }

  // Fail closed: compile into OS temp before mutating the Taro output.
  // The original APIs stay modular; only dist/skills/*/index.js is bundled.
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kps-wechat-ai-r0-'))
  const bundledEntry = path.join(buildDir, 'index.js')
  try {
    bundleEntry(path.join(skillRoot, 'index.js'), bundledEntry)
    const bundle = fs.readFileSync(bundledEntry, 'utf8')
    if (!bundle.includes('createSkill(') || !bundle.includes('registerAPI(') ||
        /require\(\s*['"]\.\/apis\//.test(bundle)) {
      throw new Error('Skill 运行入口不是自包含 bundle，禁止装配')
    }

    const projectSource = path.join(__dirname, '..', 'project.config.json')
    const project = JSON.parse(fs.readFileSync(projectSource, 'utf8'))
    project.miniprogramRoot = './'
    project.libVersion = '3.16.1'
    const packOptions = project.packOptions || {}
    project.packOptions = {
      ...packOptions,
      include: [...(packOptions.include || []).filter(x => x.value !== 'skills'),
        { type: 'folder', value: 'skills' }],
      ignore: [...(packOptions.ignore || []).filter(x => x.value !== 'cli-agent-run'),
        { type: 'folder', value: 'cli-agent-run' }]
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.cpSync(skillRoot, dest, { recursive: true, force: false, errorOnExist: true })
    fs.copyFileSync(bundledEntry, path.join(dest, 'index.js'))
    const metadata = {
      pages: [
        { path: 'pages/ai-entry/index', name: 'SOC THINK 数学学习 AI 接力入口', description: '打开计算训练或国际数学赛事管家；不自动开始训练或读取成绩' }
      ]
    }
    fs.writeFileSync(path.join(dist, 'page-meta.json'), JSON.stringify(metadata, null, 2) + '\n')
    app.subPackages = [...(app.subPackages || []),
      { root: 'skills', name: 'skills', pages: [], independent: true }]
    app.lazyCodeLoading = 'requiredComponents'
    app.agent = {
      skills: [{ name: 'math-discovery', description: '计算训练入口与国际数学赛事公开查询', path: 'skills/math-discovery' }],
      pageMetadata: 'page-meta.json'
    }
    fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n')
    fs.writeFileSync(path.join(dist, 'project.config.json'), JSON.stringify(project, null, 2) + '\n')
    return { dist, skill: dest, count: declared.apis.length, bundled: true }
  } finally {
    fs.rmSync(buildDir, { recursive: true, force: true })
  }
}

if (require.main === module) {
  try {
    const arg = process.argv[2]
    if (!arg) throw new Error('用法：node apps/miniapp/ai-mode/pack-canary.cjs apps/miniapp/dist')
    const result = packCanary(arg)
    console.log('微信 AI R0 仅测试版装配完成：', JSON.stringify(result))
    console.log('仍须微信开发模式权限 + 开发者工具/真机 handoff 验收；本命令未上传或发布。')
  } catch (error) {
    console.error('微信 AI R0 装配失败：', error.message)
    process.exitCode = 1
  }
}
module.exports = { packCanary }
