import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const ciModule = process.env.MINIAPP_CI_MODULE
if (!ciModule) {
  console.error('MINIAPP_CI=FAIL reason=missing_ci_module')
  process.exit(2)
}
const imported = await import(pathToFileURL(ciModule).href)
const ci = imported.default || imported

const mode = process.env.MINIAPP_MODE
const appRoot = process.env.MINIAPP_APP_ROOT
const appid = process.env.MINIAPP_APPID
const privateKeyPath = process.env.MINIAPP_PRIVATE_KEY_PATH
const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'))
const version = process.env.MINIAPP_VERSION || pkg.version
const desc = process.env.MINIAPP_DESC || `Socthink Math ${version}`
const robot = Math.min(30, Math.max(1, Number(process.env.MINIAPP_ROBOT || 1)))
const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: appRoot,
  privateKeyPath,
  ignores: ['node_modules/**/*', '.secrets/**/*'],
})
const setting = { useProjectConfig: true }

try {
  if (mode === 'preview') {
    const qrcodeOutputDest = process.env.MINIAPP_QR_PATH || '/tmp/socthink-miniapp-preview.png'
    const result = await ci.preview({ project, desc, setting, robot, qrcodeFormat: 'image', qrcodeOutputDest })
    console.log(`MINIAPP_CI_PREVIEW=PASS appid=${appid} robot=${robot} qrcode=${qrcodeOutputDest}`)
    if (result?.subPackageInfo) console.log(JSON.stringify({ subPackageInfo: result.subPackageInfo }))
  } else {
    const result = await ci.upload({ project, version, desc, setting, robot })
    console.log(`MINIAPP_CI_UPLOAD=PASS appid=${appid} version=${version} robot=${robot}`)
    if (result?.subPackageInfo) console.log(JSON.stringify({ subPackageInfo: result.subPackageInfo }))
  }
} catch (error) {
  console.error('MINIAPP_CI=FAIL')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
