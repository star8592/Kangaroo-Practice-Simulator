'use strict'

// The public canonical catalogue is also used by the Web and the miniapp.
// Do not send an Authorization header or disclose private companion progress.
const CATALOG_URL = 'https://socthink.cn/api/miniapp/world-competitions'
const ALLOWED_REGIONS = new Set(['all', 'US', 'AU', 'CA', 'GB', 'SG', 'global'])
const LIMIT = 8

function failure(message) {
  return { isError: true, content: [{ type: 'text', text: message }] }
}

function publicEvent(entry) {
  const e = entry && entry.event
  if (!e || typeof e !== 'object' || e.region === 'CN') return null
  if (typeof e.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(e.id)) return null
  if (typeof e.nameZh !== 'string' || !e.nameZh.trim()) return null
  const sourceUrl = typeof e.sourceUrl === 'string' && /^https:\/\//i.test(e.sourceUrl)
    ? e.sourceUrl : null
  return {
    id: e.id, nameZh: e.nameZh.slice(0, 100),
    region: String(e.region || 'global').slice(0, 16),
    summaryZh: String(e.summaryZh || '').slice(0, 240),
    sourceUrl
  }
}

function fetchCatalogue() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: CATALOG_URL,
      method: 'GET',
      timeout: 10000,
      success: res => {
        if (res.statusCode !== 200 || !Array.isArray(res.data && res.data.entries)) {
          reject(new Error('catalogue_unavailable'))
        } else resolve(res.data.entries)
      },
      fail: () => reject(new Error('network_unavailable'))
    })
  })
}

async function findInternationalCompetitions({ keyword, region = 'all' } = {}) {
  if (!ALLOWED_REGIONS.has(region)) return failure('参赛地区参数无效，请选择受支持的地区。')
  if (keyword !== undefined && (typeof keyword !== 'string' || keyword.length > 80)) {
    return failure('搜索关键词不符合要求，请使用简短的赛事名称。')
  }
  const term = (keyword || '').trim().toLocaleLowerCase()
  try {
    const entries = await fetchCatalogue()
    const all = entries.map(publicEvent).filter(Boolean)
    const filtered = all.filter(e =>
      (region === 'all' || e.region === region) &&
      (!term || (e.nameZh + ' ' + e.summaryZh + ' ' + e.id).toLocaleLowerCase().includes(term))
    )
    const items = filtered.slice(0, LIMIT)
    return {
      isError: false,
      content: [{
        type: 'text',
        text: filtered.length
          ? '查询到 ' + filtered.length + ' 项符合条件的国际数学赛事。点击小程序卡片查看赛事详情、官方来源和备赛清单。报名资格与日期须以当届官方公告为准。'
          : '当前公开赛事目录没有匹配项。请调整关键词或地区；不要编造赛事、报名时间或参赛资格。'
      }],
      structuredContent: { items, total: filtered.length, hasMore: filtered.length > LIMIT, source: 'canonical-public-catalogue' },
      handoff: { query: '' }
    }
  } catch {
    return failure('赛事目录暂时不可用，请稍后重试；不要给出未经核验的比赛时间。')
  }
}

module.exports = findInternationalCompetitions
