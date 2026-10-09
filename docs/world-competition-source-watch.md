# 全球数学赛事管家四期：官方网页变化监控与审核队列

## 已实现

官方来源监控 npm run intelligence:watch。默认五个事先审核的主办方链接：MAA 美国 AMC、中国数学会竞赛页面、澳洲 AMT AMC、加拿大 CEMC 竞赛目录、英国 UKMT 官方日历。监控目标国不等于所有用户的赛区，不能把某国公告当作全球报名开放。

监控接口仅 HTTPS、固定域名白名单、手工跳转拦截、请求 18 秒超时、响应流 800KB 上限、正文预期关键词检查。不接受第三方任意 URL。每个官方来源独立运行；支持 ETag / Last-Modified 304、正文锚点摘要 SHA256、基线与变更去重、按来源存储上次成功状态。每次检查都有健康结果，失败不覆盖原有成功指纹。默认首次成功的页面即入审核队列，不能自动解释为新一届报名开放。

审核数据存于持久化目录 SOCTHINK_USER_DATA_DIR/competition-source-watch.json。首次上线时历史不为空则继续使用。独占锁文件防止多个监控/审核进程并发覆盖；锁残留时故障关闭，不能自动强制删除潜在活跃锁。原子临时写、重命名，不能在损坏 JSON 时初始化空队列。

管理员入口 /admin/competition-source-watch；学生管理后台有跳转。GET /api/admin/competition-source-watch 仅管理员可读；PATCH 写入已阅读/忽略及审核理由，要求同源 Origin、管理员身份。审核状态记录后仍不会自动修改 data/competition-intelligence/verified-editions.json；采纳日期需核对主办方原文、明确年份/赛区/受众，并独立通过 PR、CI、生产发布。

## 定时任务

约每 6 小时执行一次，随机延迟不超过 15 分钟，单次超时 180 秒。加入 systemd unit 和安装脚本 ops/intelligence/install_source_watch.sh。发布后在服务器从 CI 已核验版本安装：

    cd /opt/socthink-math
    sudo bash ops/intelligence/install_source_watch.sh
    systemctl status socthink-competition-source-watch.timer --no-pager
    journalctl -u socthink-competition-source-watch.service -n 30 --no-pager

运行身份 UID/GID 1000，写权限限于既有私有数据目录。线上是否已启用须看 systemd 实际回执，不能以脚本存在当作成功。

## 网络实测与已知限制

2026-10-09 从 DevControl Linux 主机试采：AMT、CEMC、UKMT 三个官方来源基线成功；MAA 某次返回 HTTP 403，另一次单独探测返回 HTTP 200；中国数学会连接超时。系统保留失败，执行下一周期正常低频重试，不进行反爬绕过或非官方来源补造证据。正式服务器以安装后系统实际结果为准。

采集只做官方网页变更发现，不抓题目、不大规模采集。当前用户未设置微信订阅消息或邮件单独通知同意；该阶段不会向用户自动发送站外消息。

## 验收与下一阶段

npm run test:competition-source-watch 覆盖来源白名单、基线、去重、正文变更、跳转拦截、内容异常、超长拒绝、失败不覆盖证据、管理员鉴权、拒绝跨站审核、审核不自动发布；强制纳入 npm run verify:public。UI E2E 验证游客无权访问后台和审核 API。

后续是正式核验与外部送达：来源版本、双人字段审核、改期/撤销、用户主动选择订阅渠道、发送幂等键、频率限制、重试、退订和审计。站内提醒引擎已有，但外部消息不能绕过用户许可。


## 第一次生产验收后发现的真实故障与修复

首次运行因系统中 UID 1000 没有对应的 NSS 用户身份，systemd 返回 217/USER；当时仅 timer 已启用，扫描任务没有真正执行。
修复采用原生 systemd DynamicUser + StateDirectory，而非以 root 执行或改动整个学生私有数据目录所有权。Web 管理员 API 在 production 环境下只读取同一持久状态目录；低权限扫描进程仅可修改它自己的状态目录。需以重新安装后的 systemd 真实运行回执确认。
