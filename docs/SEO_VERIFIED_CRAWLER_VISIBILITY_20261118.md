# SOC THINK · 已验证搜索爬虫观察台（2026-11-18）

## 目的

Google、Bing、百度的站长平台已完成 Sitemap 提交，但 SOC THINK 没有官方搜索分析授权，后台官方收录/曝光/点击展示未知。这个未知不代表搜索引擎没有来访。

此改造在 SEO 后台增加独立的“真实爬虫访问记录”，显示三家的最近 7 天身份验证抓取证据。本站技术抓取通过、被搜索引擎抓取、搜索引擎收录、实际曝光、点击是五件不同的事，不能混淆。

## 核验与私密边界

- 来源：/var/log/nginx/access.log 与过去约 7 天的轮转文件。
- 不采信 User-Agent 声明本身：必须同时满足请求来源 IP 的反向 DNS 主机名后缀白名单，及该域名正向解析结果包含该 IP。
- 允许的域名后缀：Googlebot 为 .googlebot.com，bingbot 为 .search.msn.com，Baiduspider 为 .crawl.baidu.com。
- 仅根据当前 Sitemap 里的公开网址统计请求成功页面和不同公开页面数，管理员/账号/学生隐私路径一律不展示。
- 数据文件不包含 IP、Cookie、query string、完整用户代理或原始日志，只存储三家按引擎聚合的请求量、公开页面200次数、不同页面数、公开页面失败数、最近成功校验时间、最多4个公开路径。
- DNS 失败或反向域名不匹配的声明请求不计入已验证数量。零请求不代表没有索引或从未抓取。

## 运行与安装

- Python 采集脚本：scripts/seo_verified_bot_audit.py。
- 私有记录：/opt/socthink-math/private/seo/seo-verified-bots.json，0600 权限。
- 后台读取：src/lib/seo-bot-audit-store.ts，JSON 强校验，不可信数据不会呈现。
- 服务与定时器：ops/systemd/socthink-seo-bot-audit.service 和 .timer，约每6小时运行一次。
- 安装器：ops/release/install_seo_bot_audit.sh。
- 运行身份：setpriv UID/GID 1000，仅读取所需的 adm GID4 Nginx 日志；不会变更日志权限。仅能写 SEO 专用数据目录。

生产安装及验收：

    bash /opt/socthink-math/ops/release/install_seo_bot_audit.sh
    systemctl start socthink-seo-bot-audit.service
    systemctl show socthink-seo-bot-audit.service -p Result -p ExecMainStatus
    systemctl list-timers --all socthink-seo-bot-audit.timer

验证脚本使用站内原始日志和 DNS 双向校验，不向爬虫接口主动提交、不创建新用户、不干扰支付、登录、已有百度/Google/Bing官方数据采集任务。

官方真实索引量、搜索曝光、点击仍只能使用各平台正式数据，不得取爬虫请求数代替。
