# SOC THINK · 官方搜索数据每日自动采集（2026-11-18）

## 范围及原则

2026-11-18 已在百度、Google、Bing 各自的站长平台提交 Sitemap；本服务不再重复提交 URL、Sitemap 或 IndexNow。本站每日 Sitemap 技术巡检和 IndexNow 首次提交回执另行保存。

本服务仅采集有授权的官方搜索表现，供 /admin/seo 管理后台读取；不读取账户邮件、用户资料，不生成任何“预估收录量”。本地页面抓取通过、爬虫 UA、IndexNow 200 和三大平台站点验证通过，均不代表实际搜索收录。

- Google：Search Console Search Analytics API。使用 webmasters.readonly OAuth refresh token；校验 sites.list 中对应的 URL 前缀或域名属性具有访问权限，只读取已定稿的 web 搜索点击和曝光，按日归档，避免将无结果伪装成 0。
- Bing：Webmaster Tools API JSON GetUserSites + GetRankAndTrafficStats。使用独立 API Key，先确认 socthink.cn 站点经验证，再读取 Bing 返回的日度流量数据。Bing 官方数据可能包含 Web 以外的搜索产品，与 Google 统计口径不应直接相加。
- 百度：索引量与流量关键词从已经登录的官方搜索资源平台正式报表/导出获取，使用 scripts/import_seo_official_report.ts 安全归档。尚未核实提供读取索引量的官方授权 API，故没有实施不受控的模拟登录或抓包方案。

平台数据源缺失时，后台显示“尚未配置授权”，而不是“0 收录”；网络错误、权限错误和真实 API 返回空数据会分开标记。

## 授权与凭据（用户在官方平台单独授权）

不要把 API Key、Refresh Token、Client Secret 粘贴到聊天、Issue、GitHub 仓库、网页、日志或共享资料中。通过服务器 root 权限编辑 /etc/socthink/seo-official.env，文件所有者为 root，权限 0600，只由 systemd 执行时读取。

Google（在 Google Cloud Console 配置 OAuth 客户端并启用 Search Console API；用站点所有者账号授权只读范围，取得 refresh token）：

| 环境变量 | 说明 |
| --- | --- |
| SOCTHINK_GSC_CLIENT_ID | OAuth client ID |
| SOCTHINK_GSC_CLIENT_SECRET | OAuth client secret |
| SOCTHINK_GSC_REFRESH_TOKEN | 用 https://www.googleapis.com/auth/webmasters.readonly 获取的离线授权令牌 |
| SOCTHINK_GSC_SITE_URL | 后台资产 URL，如 https://socthink.cn/ 或 sc-domain:socthink.cn |

Bing（Webmaster Tools → Settings → API Access → API Key）：

| 环境变量 | 说明 |
| --- | --- |
| SOCTHINK_BING_WEBMASTER_API_KEY | 已验证账号的 Bing Webmaster API Key |
| SOCTHINK_BING_WEBMASTER_SITE_URL | 官方站点地址 https://socthink.cn/ |

以上只是配置参数清单，不代表账户已授权；站长平台登录并不会自动授予服务器后台 API 权限。Google 未能通过授权校验或 Bing 站点未验证时，不会提交数据。

## 安装与调度

脚本在仓库内：
- scripts/seo_official_auto_collect.py：只读拉取、站点授权核验、证据留存、官方数据导入。
- scripts/test_seo_official_auto_collect.py：离线契约和负面测试。
- ops/systemd/socthink-seo-official.service 和 timer：独立每日任务，上午 09:10 CST 后最多 10 分钟分散延迟；Google 和 Bing 失败相互隔离。
- ops/release/install_seo_official_collector.sh：root 安装；创建但不填充凭据文件；不中断主站、微信登录或其他业务。

安装命令（以管理员权限执行）：

    bash /opt/socthink-math/ops/release/install_seo_official_collector.sh
    systemctl start socthink-seo-official.service
    systemctl status socthink-seo-official.timer --no-pager

安装后不需要提供凭据就可以执行“授权缺失”巡检，并在后台保留真实状态。正式 API 连接之前不会产出假报表。

正式账本与健康记录位于 /opt/socthink-math/private/seo（永久目录，非发布工件）：
- seo-official-reports.json：来源审核过的正式搜索数据。
- seo-collection-status.json：通道状态与采集日期，不包含令牌。
- evidence/provider-hash.json：仅官方统计 API 返回体，用于与账本 SHA-256 校验；0600 权限，不放在 /public。

失败时服务返回非 0，便于 journal 运维观察。missing_credentials 会返回成功，但在状态中记录待授权；不会覆盖已有正式统计。
系统服务 ProtectHome、NoNewPrivileges、UMask=0077、读写路径和用户隔离已启用。

## 验收

    cd /opt/socthink-math
    npm run test:seo-storage
    python3 scripts/seo_official_auto_collect.py --check
    systemctl start socthink-seo-official.service
    journalctl -u socthink-seo-official.service -n 30 --no-pager

禁止将提交的 75 条 URL 或站内抓取通过的 75 条 URL 作为 Google/Bing/百度索引量。
生产不允许用示例数字或假 API 数据入库。没有正式站长账号数据时，seo-official-reports.json 可以不存在。

## 官方文档

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/sites/list
- https://learn.microsoft.com/en-us/bingwebmaster/
- https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getrankandtrafficstats?view=bing-webmaster-dotnet
- https://ziyuan.baidu.com/indexs/
