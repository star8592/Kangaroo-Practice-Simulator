# SOC THINK 后台宽屏导航改造 · 2026-11-14

用户观察：原主站 /admin 在宽屏浏览器中，内容集中在中间的固定宽度带，屏幕左右大量留白；导航仅是很小的横向按钮，页面纵向滚动后没有明显的模块定位。

## 一套后台，统一的布局

- 所有后台业务工作页继续复用现有 AdminOperationsNav，按「总览」「用户与教学」「内容与服务」「增长分析」分成四组。一级入口不增加新用户系统或新数据库。
- 桌面宽屏：左侧固定 232px 导航，当前项高亮且 aria-current=page，右侧经营统计自适应。最大后台内容容器扩大到 2400px，左侧保留 278px 导航区域，滚动统计页面时导航始终可见。
- 平板及手机（≤1100px）：导航转为含「菜单／收起」按钮的折叠栏；小于 620px 列表单列。采用 aria-expanded 与明确的跳转关闭。
- 横向数据表继续在表格容器内部滚动，不让整页发生水平滚动；经营/SEO 卡片继续依既有 1160/900/650px 断点分栏。
- 全站通用 layout-wide 由 1440px 调为 1920px、layout-standard 调为 1600px，为具备列式内容的目录留出宽度；正文/阅读/考试专用 layout-focus、layout-reading、layout-auth 保持原值，避免文字过长。
- /admin/login 与 /admin/activate 不渲染管理导航，身份验证页不向匿名访客暴露后台业务入口。
- 不修改财务、支付、用户授权、微信登录、班级数据、AI 评分、PostgreSQL 版本及正式部署方式。

## 验证

- TypeScript 类型检查与 ESLint；主站 quality_gate.sh 将宽屏导航合同作为正式 CI 校验，题库异常页面仍有可见后台导航。
- next build --webpack 完整生成正式 Next.js 路由；独立工作树软链接的 node_modules 会令 Turbopack hermetic 构建找不到本地包，应以 GitHub CI 独立安装依赖的标准构建为正式验收。
- scripts/test_admin_wide_navigation_contract.mjs：导航路由、分组、高亮、可访问性、响应式 CSS 断点和覆盖全部管理员工作页面。
- 正式合并必须继续执行既有 GitHub quality、桌面/手机 Chromium E2E 与生产回执，不可凭本地编译直接宣布上线。
