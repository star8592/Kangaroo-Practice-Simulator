# SOC THINK SEO 收录监控后台设计与运维（2026-11-01）

**执行状态：等待本 PR 的 CI、正式部署与生产验收；在平台授权前不声称实际收录。**

## 产品定义

后台入口：`/admin/seo`，仅已有管理员账号可访问。此模块聚焦「真实用户搜索 SOC THINK → 引流 → 付费」中搜索阶段的可观测性，不另建一套后台。

要回答四个不同问题：

1. **发布了多少公开页面**：从本站实际 `sitemap.xml` 得到，数据不等于收录。
2. **有多少页面能被抓取**：每日无登录 HTTP 200、URL 重定向、Canonical、H1、Noindex 和 robots.txt 技术巡检。平台级抓取权限不由这个探针证明。
3. **百度 / Google / Bing 真正收录多少**：只能来自已验证的官方站长资产和报表，未接通前显示「— / 尚未接入」，绝不能显示 0 或推断数字。
4. **从搜索来了多少流量、成交多少收入**：自然搜索点击与展示属于各搜索平台数据，实际收款由独立收费账本记录；需要真实归因后才可以关联，不能把点击数当销售收入。

## 官方依据与指标口径

- 百度搜索资源平台「索引量」：https://ziyuan.baidu.com/indexs/ 。官方说明数据最快每天更新、最迟约一周更新。应按其真实数据日期标记，不能把延迟当作 0。
- Google Search Console 页面索引报告：https://support.google.com/webmasters/answer/96568 。这是覆盖总体页数的主要报表；Google Search Console URL Inspection API 可为具体页面取回索引状态，且有请求配额。
- Google Search Analytics API：https://developers.google.com/webmaster-tools/v1/searchanalytics/query 。提供点击、展示、查询词和着陆页面，但返回常按点击排名的部分行，不能把所获行数当所有搜索流量页面数。
- **Google Sitemap API `contents[].indexed` 已废弃、不可使用**：https://developers.google.com/webmaster-tools/v1/sitemaps 。
- Bing Webmaster Tools：https://www.bing.com/webmasters/help/url-inspection-55a30305 。Site Explorer / URL Inspection 显示 Bing 的真实索引情况。旧 SOAP/POX 接口 2026-08-31 已退役，新接入只能采用仍受支持的官方 REST 方式。
- IndexNow 的 200/202 接收回执表示通知成功，不表示已收录。

## 技术架构：唯一后台 + 单个独立定时监控

- `/admin/seo`：Next.js 服务端管理员权限（现有 `SESSION_COOKIE` / `isAdmin`）；禁索引，不允许游客看监测数据。
- `src/lib/seo-monitor-store.ts`：读取真实采样历史；Google、百度、Bing 当前状态 `not_connected`，所有索引/点击/展示数为 `null`。禁止“空值归零”。
- `scripts/seo_monitor_daily.mjs`：**只读**抓取本站实时 Sitemap、robots 和最多解析 100,000 个 Sitemap URL，并抽取最多 200 个代表性规范 URL 做技术检查；对异常保存路径和原因，不抓取私有试卷/答案/用户数据。
- 历史在 `SOCTHINK_USER_DATA_DIR/seo-monitor-snapshots.json`，随已有持久数据挂载保留，按 UTC 日期归并，最多 365 天，原子写入、权限 `0600`。
- `ops/seo/socthink-seo-monitor.service` + `ops/seo/socthink-seo-monitor.timer`：**每天一次、独立失败隔离**；它不调用其他业务任务，不阻止网站发布，不另建数据库，错误只影响监测自身。
- 不依赖 Chrome 调试端口，不绕过任何浏览器授权；不自动登入百度/Google/Bing 用户后台。
- 现有发布脚本在不可变运行包中携带采集器；systemd unit/timer 与现有生产主服务分离。

## 首次部署与真实验收

1. PR 现有 quality、billing-ledger、browser E2E 通过，及 `node --test scripts/test_seo_monitor_daily.mjs` 本地测试。
2. 合并 main；原有 `socthink-auto-deploy.service` 完成不可变构建、候选验收、真实公网 SHA 和回退。
3. 在生产安装 **唯一** `ops/seo/socthink-seo-monitor.service` 与 `.timer`，`systemctl daemon-reload` 并启用 timer。不会改现有站点、收费或赛事采集 timers。
4. 手动运行监测一次（生产真实网页采样），核对日志、json 快照、数据文件拥有者、模式与时区；故障情况下不把空结果当正常。
5. 用匿名用户访问 `/admin/seo` 必须不能看到后台，管理员能看到实测结果。不得通过公共 URL 或 Sitemap 泄露监测文件。
6. 正式生产日报记录全部 Sitemap 公开 URL 总量、实际抽检样本数和抽检通过数；搜索引擎真实收录必须显示「— 尚未接入」，直到有官方授权回执。

## 接入各站长平台时的明确边界

目前没有可靠的 Search Console、百度站长、Bing Webmaster 已授权账户/报告回执，因此此批**只构建官方指标槽位，不伪造索引数**。站点授权完成后分离接入：
- Google：只读 OAuth/服务账号 + Search Analytics；实际索引总量依靠官方 Page Indexing 报告来源，或 URL Inspection 的明确样本索引数（样本必须标注样本，不冒称全站）。
- 百度：以官方「索引量」及数据日期为准，可在获得可靠的官方导出/授权通道后导入。
- Bing：经过验证的官方站长 REST / 报告接口，不再调用退役的 SOAP/POX。
- 各平台数据记录 `source / measuredAt / updatedAt / scope`，过期标记，流量与收入对账不得编造。

## 面向未来大量 K12 页面

Sitemap URL 总数与抓取技术抽样是两个独立指标：可完整计数最多 100,000 个 URL，但单轮最多检查 200 个公开页面（固定保留首页前部、尾部新页面与全局分布样本）。页面数超过抽样上限后，后台必须明确显示「抽检样本 N」和「抽检通过 M」，**不能将 M/N 解释为整站全部页面的正常比例，也不能解释为实际收录率**。正式搜索引擎索引量必须来自对应平台的已授权官方报表。
