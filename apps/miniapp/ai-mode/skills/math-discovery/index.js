// R0 canary only. Not linked into the production Taro app yet.
const prepareArithmeticTraining = require('./apis/prepareArithmeticTraining.js')
const findInternationalCompetitions = require('./apis/findInternationalCompetitions.js')

const skill = wx.modelContext.createSkill('skills/math-discovery')
skill.registerAPI('prepareArithmeticTraining', prepareArithmeticTraining)
skill.registerAPI('findInternationalCompetitions', findInternationalCompetitions)
