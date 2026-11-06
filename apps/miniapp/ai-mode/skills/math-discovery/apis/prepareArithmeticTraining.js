'use strict'

// Route discovery only. No activity is started and no learning record is touched.
async function prepareArithmeticTraining({ grade } = {}) {
  if (grade !== undefined && (!Number.isInteger(grade) || grade < 1 || grade > 12)) {
    return {
      isError: true,
      content: [{ type: 'text', text: '年级必须在 1 至 12 之间；请让家长确认年级。' }]
    }
  }
  const known = grade !== undefined
  const confirmedGrade = known ? grade : null
  return {
    isError: false,
    content: [{
      type: 'text',
      text: known
        ? '已找到计算训练入口。请点击小程序卡片，确认 ' + grade + ' 年级后开始训练；当前版本不会自动预选年级。'
        : '已找到计算训练入口。请点击小程序卡片，选择年级后直接开始；不要替孩子猜测年级。'
    }],
    structuredContent: {
      service: 'arithmetic-training',
      suggestedGrade: confirmedGrade,
      requiresInAppConfirmation: true,
      started: false
    },
    handoff: { query: known ? 'mode=arithmetic&grade=' + grade : 'mode=arithmetic' }
  }
}

module.exports = prepareArithmeticTraining
