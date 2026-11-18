# SOC THINK 搜索引擎官方报表接入（2026-11-18）

## 数据边界

本地 Sitemap 抽检通过、IndexNow 的 HTTP 200、站点所有权验证，以及访问日志中的爬虫 User-Agent 均不代表真实收录量。

后台的三项搜索指标仅从独立的 private/seo/seo-official-reports.json 读取：

- indexCount：官方索引报告的站点/目录统计，不从 Sitemap URL 总数推导。
- impressions：官方自然搜索曝光；对应报表 periodStart/periodEnd。
- clicks：官方自然搜索点击；对应报表 periodStart/periodEnd。

缺少官方报表时保持 null，不得写零。官方报表更新延迟、字段缺失、统计时间窗不同均可出现，UI 显示来源与日期。损坏的记录文件须报错，不得回退为伪造成功。

## 支持的报表来源

| 搜索引擎 | 允许的来源 | 指标 |
| --- | --- | --- |
| 百度 | baidu_index_report_export | indexCount |
| 百度 | baidu_search_performance_export | impressions, clicks |
| Google | google_page_indexing_report_export | indexCount |
| Google | google_search_analytics_api | impressions, clicks |
| Bing | bing_site_explorer_export | indexCount |
| Bing | bing_webmaster_api | impressions, clicks |

这些只是接入格式的允许值，不表示上述六条采集通道目前均已授权或自动运行。Google Search Analytics API 需要该站点的 OAuth 授权；Bing 官方 API 需要相应密钥。百度的索引量可使用平台授权站点的正式导出。独立采集器应当读取服务端保管的凭据，导入前核对站点及返回内容，不得向网页或日志输出令牌。

## 受控一次性导入

只有确认拿到了对应官方平台的原始报表或 API 响应后才执行。

归一化私有 JSON 的字段为：
site（固定 https://socthink.cn）、provider、source、periodStart、periodEnd、metrics。
metrics 中仅能包含该来源支持的 clicks、impressions 或 indexCount，均为真实报表中的整数。

将官方证据另存为私有文件，并执行如下命令（路径按实际调整）：

SOCTHINK_SEO_DATA_DIR=/secure/seo npx tsx scripts/import_seo_official_report.ts --input /secure/normalized-report.json --evidence /secure/original-official-response.json

导入脚本校验来源与指标的合法组合、站点、整数、日期和原始证据的 SHA-256；采用私有目录与原子写入，重复导入同一来源和日期不会重复计数。证据哈希便于事后核验，但不等于导入程序已经通过 OAuth 独立验证了证据真伪；导入者须保证原始文件确实来自授权的站长平台。

运行前核对所有字段与统计口径，避免把日流量和周流量放在同一日比较。

## 已完成与未完成

- 已完成：持久化模型、受控报表导入、来源/统计周期显示、未知/过期/损坏状态、专项测试。
- 尚未完成：Google Search Console OAuth 的自动拉取、Bing Webmaster API 自动拉取、百度索引量的自动导出/采集，以及任何平台的实际官方数据入库。未授权时后台仍保持未知。
- 站内每日技术巡检原功能及 IndexNow 单次推送记录保持独立；不得将它们合入官方数据文件。

开发测试：npm run test:seo-storage。
