export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/arithmetic/index',
    'pages/competitions/index',
    'pages/profile/index',
    'pages/login/index',
    'pages/events/index',
    'pages/exam/index',
    'pages/review/index'
  ],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: 'SOC THINK 数学成长',
    backgroundColor: '#f5f7fb'
  },
  tabBar: {
    color: '#6b7280',
    selectedColor: '#111827',
    backgroundColor: '#ffffff',
    list: [
      { pagePath: 'pages/home/index', text: '首页' },
      { pagePath: 'pages/arithmetic/index', text: '计算' },
      { pagePath: 'pages/competitions/index', text: '竞赛' },
      { pagePath: 'pages/profile/index', text: '我的' }
    ]
  }
})
