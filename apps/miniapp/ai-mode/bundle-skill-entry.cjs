'use strict'

// Runtime-proven fix (2026-10-21): WeChat's independent Skill subpackage can
// discover index.js while failing to register its relative CommonJS imports.
// Bundle ONLY the test-build entrypoint; leave modular source APIs intact.
const fs = require('node:fs')

function bundleSkillEntry(entry, output) {
  let esbuild
  try { esbuild = require('esbuild') }
  catch { throw new Error('缺少 esbuild；请先安装 miniapp 的锁定依赖，禁止使用未打包 Skill') }
  esbuild.buildSync({
    entryPoints: [entry],
    outfile: output,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2018',
    logLevel: 'silent',
    sourcemap: false,
    minify: false
  })
  const code = fs.readFileSync(output, 'utf8')
  if (!code.includes('createSkill(') ||
      !code.includes('registerAPI(') ||
      code.includes("require('./apis/") || code.includes('require("./apis/')) {
    throw new Error('Skill 运行入口未成功打包为独立、无相对 require 的文件')
  }
}

module.exports = { bundleSkillEntry }
