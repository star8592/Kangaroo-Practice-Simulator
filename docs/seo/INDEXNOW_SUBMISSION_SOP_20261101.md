# SOC THINK IndexNow 正式接入 SOP（2026-11-01）

状态：代码候选待 CI 与生产部署。对应 SEO+GEO ADR 的 P1「真实可发现性与站长工具」。

## 官方依据

- IndexNow 协议：https://www.indexnow.org/documentation
- Bing 官方入门：https://www.bing.com/indexnow/getstarted
- Bing URL 提交工具：https://www.bing.com/webmasters/help/URL-Submission-62f2860b

Bing 官方推荐 IndexNow 用于新增、实质修改或删除 URL 的发布通知；普通 Sitemap 仍然保留，不存在任何“提交即收录”的保证。Google 和百度仍须分别使用它们支持的官方收录机制；**IndexNow 不代表向 Google、百度或 ChatGPT 提交成功**。

## 本项目技术选择

不新建后台、计时器、数据库、第二条发布链或涉及支付的任务。

- 域名：\`socthink.cn\`，只允许 HTTPS 站内规范化 URL。
- 验证文件：\`public/f4d6c6f4e8735cc9cea17156fdeac577591666a9.txt\`。这是 IndexNow **公开密钥**，不是收款或身份凭据。文件内容必须匹配文件名中的 key。
- 一次性发布工具：\`scripts/seo_indexnow_submit.py\`，默认只读干跑。
- URL 权威来源：实时已发布的 \`https://socthink.cn/sitemap.xml\`，不读取未审核题库、未完成内容或私有考卷。
- 发送之前必须通过公网页面的 200、最终 URL、canonical 及 key 文件验证；任一失败即退出。
- 接受 200/202 仅表示服务器已接受/已认可通知请求；不会冒称已抓取、已索引或已获推荐。
- 不自动重试、重复批量推送或添加调度器。正式发布真正变更 URL 时，可在原有发布回执成功**之后**按需用 \`--path\` 通知，不影响发布主链。

## 操作步骤

**首轮上线后，先使用预演验证：**

    python3 scripts/test_seo_indexnow_submit.py
    python3 scripts/seo_indexnow_submit.py --bootstrap

验证 \`INDEXNOW_PUBLIC_KEY=PASS\`、14 个（或以后真实 sitemap 数量）公开 URL 与 Canonical 都有效，确认未提交。

**仅第一次首次启用可以运行：**

    python3 scripts/seo_indexnow_submit.py --bootstrap --submit

记录返回 HTTP 状态、URL 数量、时间和执行位置；返回非 200/202 不判定成功。**首次提交仅允许一次，不重复循环发送来刷所谓收录。**

**之后只提交实质更新的已发布页面：**

    python3 scripts/seo_indexnow_submit.py --path /resources/competitions/cemc --submit

如没有内容变化，什么都不提交。请求参数包含私有 URL、跨站域名、查询字符串或 Sitemap 没有的页面时，脚本应直接拒绝。

## 发布验收

1. GitHub PR 的质量、收费账本、Web 浏览器检查必须走已有 CI；
2. 合并 main 后由既有 \`socthink-auto-deploy.service\` 构建、候选、库存保护、回滚、公网 SHA 对账；
3. 公网验证 key 文件 HTTP 200、内容准确；Sitemap 的 14 个（或实际最新数量） URL 可抓取；
4. 线下测试脚本正常拒绝跨域/私有/未发布 URL；
5. 预演通过后执行一次 IndexNow 真实提交；记录原始 HTTP 返回结果；
6. Bing Webmaster 的 IndexNow 收到/收录状态需另查已验证站长账号。**没有权限或真实索引报告时仍写 UNKNOWN**。

最后：该功能不对 Google 官方 Indexing API 发送普通网页，也不应在 AI 搜索中宣称已获得特别推荐。
