# SOCTHINK P0 搜索可见性技术审计记录（2026-10-31）

状态：**生产匿名 HTTP 与部分源码核验完成；本次 P1 基础修复已在独立分支提交，尚未视为生产通过。**
依据：[已采纳的 SEO＋GEO ADR](../architecture/SOCTHINK_SEO_GEO_SEARCH_GROWTH_20261031.md)。

## 1. 审计来源和范围

- 测试环境：Z890 主机，2026-10-31，标准 HTTP GET、curl 响应头以及 Python urllib（含 CookieJar 的复测）。**不使用登录用户数据、微信商户凭证和生产后台写操作。**
- 对照源码：GitHub main，Next.js 16.4.3，现有 App Router 页面；这次正式改造在单独 GitHub 分支进行。
- 审计边界：普通公开 URL 和元信息；**Search Console、百度搜索资源平台、Bing Webmaster 账号是否验证及索引数据仍为 UNKNOWN**。不能据此声称搜索引擎已有收录。
- Z890 本地项目仓库存在其他任务未提交变更，且本地 HEAD 与 GitHub main 不一致，因此**没有在该工作区覆写或清理文件**。

## 2. 真实生产回执

| URL | 首轮匿名响应 | 后续结论 |
| --- | --- | --- |
| / | 200 text/html | HTML 标题可见；初次未检测到 canonical |
| /robots.txt | **404** | 没有响应可用的 robots 文件 |
| /sitemap.xml | **404** | 现有标准 sitemap 入口缺失 |
| /sitemap-index.xml | 404 | 非必须入口，记录观察，不作为单独缺陷 |
| /resources | 200 text/html | 正文含可用训练卷数据；未检测到 canonical |
| /assessments | 200 | 公开目录，单独标题 |
| /competitions | 200 | 公共竞赛入口，旧页面与首页使用相同通用 title |
| /events | 200（外部公开爬虫核验） | 赛事管家有独立正文和标题 |
| /exam-planner | 200 | 公开考试管理页有独立 title |
| /privacy | 200 | 公开政策页使用通用 title；内容条款另行做法律/产品一致性核查 |
| /terms | 200 | 公开条款页使用通用 title |
| /digital-purchase-policy | 200 | 公开售后说明页有独立 title |
| /api/release | 200 application/json | 生产身份接口；**不列入 Sitemap** |
| /exams | 404 | 这只是旧方案中的候选路径，不应被当作已经存在的 URL |
| /resource-center | 404 | 非生产正式路径；实际资料中心是 /resources |

### /arithmetic 特别复核（防止误报）

未保存 Cookie 的 urllib 自动跳转遇到重复 307，并非已证实的网站故障。
- GET /arithmetic → 307 /api/auth/guest/start?next=/arithmetic；
- GET /api/auth/guest/start?next=/arithmetic → 307 /arithmetic，设置安全的 HttpOnly SameSite Cookie；
- **使用 CookieJar 的匿名访客真实请求可正常到达 /arithmetic HTTP 200**。
因此该项**撤销“循环跳转故障”判定**。因它需要会话初始化，本轮没有纳入公开 Sitemap；后续需要可索引数学训练介绍页时再做独立公开入口。

## 3. 实证根因与本轮改动

GitHub main 中没有 src/app/robots.ts、src/app/sitemap.ts；根 layout 只有通用 title/description，无 metadataBase；部分公共页没有显式 alternates.canonical。

本轮采用 Next.js App Router 官方 MetadataRoute 机制：
1. 新增 src/app/robots.ts：公开可抓取、屏蔽无意义的账号/API/私有训练会话抓取路径，列出官方 Sitemap 地址；
2. 新增 src/app/sitemap.ts：仅包含已确认匿名返回 HTTP 200 的 9 条公共页面 URL；**不虚构 lastmod，不把不确定试卷页面/用户/支付记录列进去**；
3. 在 layout 设置 metadataBase=https://socthink.cn；
4. 首页、/resources、/assessments、/competitions、/events、/exam-planner、/digital-purchase-policy 添加自身 canonical；/competitions 增加独立 title 和 description；
5. 不改变试卷库存、登录会话、考试评分、支付逻辑、数据源，也不增加 CI 门禁。

此处写“已提交分支”不表示已上线。只有 PR CI、合并、自动发布回执与公网重测成功后才可改为 **PUBLICLY VERIFIED**。

## 4. 后续 P0/P1 未完成项

- [ ] PR CI 三项（quality、billing-ledger、Web browser E2E）是否真实成功；
- [ ] 合并 main、自动发布及正式生产 SHA 对账；
- [ ] 公网 /robots.txt 与 /sitemap.xml 返回 200，robots 正确指向 Sitemap，且 XML 能解析；
- [ ] XML 内所有 URL 逐一重新检查 anonymous 200、Canonical 与 noindex/权限边界；
- [ ] 重新取首页/资源页/比赛页 HTML，确认实际 canonical 是绝对 HTTPS URL；
- [ ] 核查 Google/百度/Bing 站长后台的验证和真实收录基线（未授权/未开放时记录 UNKNOWN）；
- [ ] 检查其他业务目录、页内链接、手机浏览器、页面性能以及可用资料逐卷公开与授权状态；
- [ ] 完成试卷可索引详情页方案（P2），不要根据资源数量机械制造薄页。

## 5. 官方实现参考

- Next.js robots MetadataRoute：https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
- Next.js Sitemap MetadataRoute：https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- Google Search Central：https://developers.google.com/search/docs/crawling-indexing
