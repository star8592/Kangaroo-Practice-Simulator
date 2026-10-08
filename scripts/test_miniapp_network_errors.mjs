import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMiniappNetworkError } from '../apps/miniapp/src/services/network-errors.ts'

test('WeChat blocks request URL before reaching server', () => {
  const issue = normalizeMiniappNetworkError({ errMsg:'request:fail url not in domain list' })
  assert.match(issue.message, /域名/)
  assert.match(issue.message, /微信/)
})

test('Chinese request domain error is actionable', () => {
  const issue = normalizeMiniappNetworkError({ errMsg:'request:fail 域名不在合法域名列表中' })
  assert.match(issue.message, /域名/)
})

test('Timeout retains network recovery advice', () => {
  const issue = normalizeMiniappNetworkError({ errMsg:'request:fail timeout' })
  assert.match(issue.message, /超时/)
})

test('Other network failures are visible', () => {
  const issue = normalizeMiniappNetworkError({ errMsg:'request:fail' })
  assert.match(issue.message, /无法连接/)
})

test('Server-generated validation Error keeps its original message', () => {
  const error = new Error('输入无效，请更换年级')
  assert.equal(normalizeMiniappNetworkError(error), error)
})

test('Unknown rejection returns a user-visible Error', () => {
  const error = normalizeMiniappNetworkError(null)
  assert.ok(error instanceof Error)
  assert.ok(error.message.length > 2)
})
