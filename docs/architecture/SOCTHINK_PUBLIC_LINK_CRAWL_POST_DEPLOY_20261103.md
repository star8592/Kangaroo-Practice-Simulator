# SOC THINK 页面架构 v1.2 生产复验：189 条公开路径

时间（UTC）：2026-11-03T02:34:30Z。原始基址：https://socthink.cn。生产部署 SHA：`52412cdbbd49dfd8c5f37b4df885d61c1430c76a`。脚本：scripts/audit_site_public_crawl.py。

本轮已覆盖全部 59 个 Sitemap URL（包含公开的 `/verification`）、职业动态岗位/面试详情与可读商城商品页。与整改前基线比较：Sitemap 从 37 项增加到 59 项，已知重复 `<main>` 从 7 个公开 URL 降至 0。不同轮次扫描范围变化（117 → 189），不能把样本量误报成新增页面数量。

这不是完整私有权限 E2E，也不是对动态试卷/商品实例的全量验证。只读取公开、匿名、GET 的 HTML/站点地图；登录、订单、管理、报告、API、下载等敏感或状态页明确跳过，不能据此认定它们是孤儿。

## 概况

- 共抽查：189 个公开站内 URL；当前脚本上限：220；Sitemap 发现：59；状态分布：{"200": 187, "307": 2}。
- 匿名检索到多主地标页面：0；被本轮其他页面内链发现为 0 的条目：0（不代表确定孤儿页，可能是 Sitemap 入口）。
- 站点地图读取异常：无。
- 原始内容最终跳转到 /login 的页面：11。这类 HTTP 200 是**登录页**，不能计入原页面已成功展示。

## 逐 URL 现场验证

| URL | HTTP | 最终路径 | 页面 main 数 | canonical | 已发现站内入口数 |
| --- | --- | --- | ---: | --- | ---: |
| `/` | 200 | `/` | 1 | `https://socthink.cn` | 187 |
| `/arithmetic` | 307 | `/arithmetic` | - | 未发现 | 3 |
| `/arithmetic/print` | 307 | `/arithmetic/print` | - | 未发现 | 1 |
| `/assessment-center` | 200 | `/assessment-center` | 1 | `https://socthink.cn/assessment-center` | 187 |
| `/assessment-center/about` | 200 | `/assessment-center/about` | 1 | `https://socthink.cn/assessment-center/about` | 8 |
| `/assessment-center/advanced-reasoning-40` | 200 | `/assessment-center/advanced-reasoning-40` | 1 | `https://socthink.cn/assessment-center/advanced-reasoning-40` | 2 |
| `/assessment-center/career-aptitude-40` | 200 | `/assessment-center/career-aptitude-40` | 1 | `https://socthink.cn/assessment-center/career-aptitude-40` | 3 |
| `/assessment-center/career-interest-exploration-30` | 200 | `/assessment-center/career-interest-exploration-30` | 1 | `https://socthink.cn/assessment-center/career-interest-exploration-30` | 2 |
| `/assessment-center/ipip-big-five-50-cn-preview` | 200 | `/assessment-center/ipip-big-five-50-cn-preview` | 1 | `https://socthink.cn/assessment-center/ipip-big-five-50-cn-preview` | 3 |
| `/assessment-center/methodology` | 200 | `/assessment-center/methodology` | 1 | `https://socthink.cn/assessment-center/methodology` | 187 |
| `/assessment-center/reading-practice-16` | 200 | `/assessment-center/reading-practice-16` | 1 | `https://socthink.cn/assessment-center/reading-practice-16` | 2 |
| `/assessment-center/reasoning-practice-20` | 200 | `/assessment-center/reasoning-practice-20` | 1 | `https://socthink.cn/assessment-center/reasoning-practice-20` | 2 |
| `/assessment-center/report-preview` | 200 | `/assessment-center/report-preview` | 1 | `https://socthink.cn/assessment-center/report-preview` | 1 |
| `/assessment-center/work-style-24` | 200 | `/assessment-center/work-style-24` | 1 | `https://socthink.cn/assessment-center/work-style-24` | 2 |
| `/assessment-center/work-values-30` | 200 | `/assessment-center/work-values-30` | 1 | `https://socthink.cn/assessment-center/work-values-30` | 2 |
| `/assessment-center/workplace-sjt-24` | 200 | `/assessment-center/workplace-sjt-24` | 1 | `https://socthink.cn/assessment-center/workplace-sjt-24` | 2 |
| `/assessments` | 200 | `/assessments` | 1 | `https://socthink.cn/assessments` | 187 |
| `/career` | 200 | `/career` | 1 | `https://socthink.cn/career` | 187 |
| `/career/companies` | 200 | `/career/companies` | 1 | `https://socthink.cn/career/companies` | 1 |
| `/career/exams/agent-engineering-paper-2026q4-v1` | 200 | `/career/exams/agent-engineering-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/agent-engineering-paper-2026q4-v1` | 3 |
| `/career/exams/operations-paper-2026q4-v1` | 200 | `/career/exams/operations-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/operations-paper-2026q4-v1` | 2 |
| `/career/exams/procurement-paper-2026q4-v1` | 200 | `/career/exams/procurement-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/procurement-paper-2026q4-v1` | 6 |
| `/career/exams/quality-paper-2026q4-v1` | 200 | `/career/exams/quality-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/quality-paper-2026q4-v1` | 2 |
| `/career/guides/manufacturing-fmea-handbook` | 200 | `/career/guides/manufacturing-fmea-handbook` | 1 | `https://socthink.cn/career/guides/manufacturing-fmea-handbook` | 2 |
| `/career/guides/retail-campaign-roi-handbook` | 200 | `/career/guides/retail-campaign-roi-handbook` | 1 | `https://socthink.cn/career/guides/retail-campaign-roi-handbook` | 2 |
| `/career/guides/supplier-decision-handbook` | 200 | `/career/guides/supplier-decision-handbook` | 1 | `https://socthink.cn/career/guides/supplier-decision-handbook` | 5 |
| `/career/interviews` | 200 | `/career/interviews` | 1 | `https://socthink.cn/career/interviews` | 3 |
| `/career/interviews/campus-software` | 200 | `/career/interviews/campus-software` | 1 | `https://socthink.cn/career/interviews/campus-software` | 1 |
| `/career/interviews/social-procurement` | 200 | `/career/interviews/social-procurement` | 1 | `https://socthink.cn/career/interviews/social-procurement` | 1 |
| `/career/roles/business-01-01` | 200 | `/career/roles/business-01-01` | 1 | `https://socthink.cn/career/roles/business-01-01` | 9 |
| `/career/roles/business-01-02` | 200 | `/career/roles/business-01-02` | 1 | `https://socthink.cn/career/roles/business-01-02` | 9 |
| `/career/roles/business-01-03` | 200 | `/career/roles/business-01-03` | 1 | `https://socthink.cn/career/roles/business-01-03` | 9 |
| `/career/roles/business-01-04` | 200 | `/career/roles/business-01-04` | 1 | `https://socthink.cn/career/roles/business-01-04` | 9 |
| `/career/roles/business-01-05` | 200 | `/career/roles/business-01-05` | 1 | `https://socthink.cn/career/roles/business-01-05` | 8 |
| `/career/roles/business-01-06` | 200 | `/career/roles/business-01-06` | 1 | `https://socthink.cn/career/roles/business-01-06` | 8 |
| `/career/roles/business-01-07` | 200 | `/career/roles/business-01-07` | 1 | `https://socthink.cn/career/roles/business-01-07` | 8 |
| `/career/roles/business-01-08` | 200 | `/career/roles/business-01-08` | 1 | `https://socthink.cn/career/roles/business-01-08` | 8 |
| `/career/roles/business-01-09` | 200 | `/career/roles/business-01-09` | 1 | `https://socthink.cn/career/roles/business-01-09` | 8 |
| `/career/roles/construction-01-01` | 200 | `/career/roles/construction-01-01` | 1 | `https://socthink.cn/career/roles/construction-01-01` | 7 |
| `/career/roles/construction-01-02` | 200 | `/career/roles/construction-01-02` | 1 | `https://socthink.cn/career/roles/construction-01-02` | 7 |
| `/career/roles/construction-01-03` | 200 | `/career/roles/construction-01-03` | 1 | `https://socthink.cn/career/roles/construction-01-03` | 7 |
| `/career/roles/construction-01-04` | 200 | `/career/roles/construction-01-04` | 1 | `https://socthink.cn/career/roles/construction-01-04` | 7 |
| `/career/roles/construction-01-05` | 200 | `/career/roles/construction-01-05` | 1 | `https://socthink.cn/career/roles/construction-01-05` | 6 |
| `/career/roles/construction-01-06` | 200 | `/career/roles/construction-01-06` | 1 | `https://socthink.cn/career/roles/construction-01-06` | 6 |
| `/career/roles/construction-01-07` | 200 | `/career/roles/construction-01-07` | 1 | `https://socthink.cn/career/roles/construction-01-07` | 6 |
| `/career/roles/creative-01-01` | 200 | `/career/roles/creative-01-01` | 1 | `https://socthink.cn/career/roles/creative-01-01` | 9 |
| `/career/roles/creative-01-02` | 200 | `/career/roles/creative-01-02` | 1 | `https://socthink.cn/career/roles/creative-01-02` | 9 |
| `/career/roles/creative-01-03` | 200 | `/career/roles/creative-01-03` | 1 | `https://socthink.cn/career/roles/creative-01-03` | 9 |
| `/career/roles/creative-01-04` | 200 | `/career/roles/creative-01-04` | 1 | `https://socthink.cn/career/roles/creative-01-04` | 9 |
| `/career/roles/creative-01-05` | 200 | `/career/roles/creative-01-05` | 1 | `https://socthink.cn/career/roles/creative-01-05` | 8 |
| `/career/roles/creative-01-06` | 200 | `/career/roles/creative-01-06` | 1 | `https://socthink.cn/career/roles/creative-01-06` | 8 |
| `/career/roles/creative-01-07` | 200 | `/career/roles/creative-01-07` | 1 | `https://socthink.cn/career/roles/creative-01-07` | 8 |
| `/career/roles/creative-01-08` | 200 | `/career/roles/creative-01-08` | 1 | `https://socthink.cn/career/roles/creative-01-08` | 8 |
| `/career/roles/creative-01-09` | 200 | `/career/roles/creative-01-09` | 1 | `https://socthink.cn/career/roles/creative-01-09` | 8 |
| `/career/roles/digital-01-01` | 200 | `/career/roles/digital-01-01` | 1 | `https://socthink.cn/career/roles/digital-01-01` | 10 |
| `/career/roles/digital-01-02` | 200 | `/career/roles/digital-01-02` | 1 | `https://socthink.cn/career/roles/digital-01-02` | 10 |
| `/career/roles/digital-01-03` | 200 | `/career/roles/digital-01-03` | 1 | `https://socthink.cn/career/roles/digital-01-03` | 10 |
| `/career/roles/digital-01-04` | 200 | `/career/roles/digital-01-04` | 1 | `https://socthink.cn/career/roles/digital-01-04` | 10 |
| `/career/roles/digital-01-05` | 200 | `/career/roles/digital-01-05` | 1 | `https://socthink.cn/career/roles/digital-01-05` | 9 |
| `/career/roles/digital-01-06` | 200 | `/career/roles/digital-01-06` | 1 | `https://socthink.cn/career/roles/digital-01-06` | 9 |
| `/career/roles/digital-01-07` | 200 | `/career/roles/digital-01-07` | 1 | `https://socthink.cn/career/roles/digital-01-07` | 9 |
| `/career/roles/digital-01-08` | 200 | `/career/roles/digital-01-08` | 1 | `https://socthink.cn/career/roles/digital-01-08` | 9 |
| `/career/roles/digital-01-09` | 200 | `/career/roles/digital-01-09` | 1 | `https://socthink.cn/career/roles/digital-01-09` | 9 |
| `/career/roles/digital-01-10` | 200 | `/career/roles/digital-01-10` | 1 | `https://socthink.cn/career/roles/digital-01-10` | 9 |
| `/career/roles/finance-01-01` | 200 | `/career/roles/finance-01-01` | 1 | `https://socthink.cn/career/roles/finance-01-01` | 10 |
| `/career/roles/finance-01-02` | 200 | `/career/roles/finance-01-02` | 1 | `https://socthink.cn/career/roles/finance-01-02` | 10 |
| `/career/roles/finance-01-03` | 200 | `/career/roles/finance-01-03` | 1 | `https://socthink.cn/career/roles/finance-01-03` | 10 |
| `/career/roles/finance-01-04` | 200 | `/career/roles/finance-01-04` | 1 | `https://socthink.cn/career/roles/finance-01-04` | 10 |
| `/career/roles/finance-01-05` | 200 | `/career/roles/finance-01-05` | 1 | `https://socthink.cn/career/roles/finance-01-05` | 9 |
| `/career/roles/finance-01-06` | 200 | `/career/roles/finance-01-06` | 1 | `https://socthink.cn/career/roles/finance-01-06` | 9 |
| `/career/roles/finance-01-07` | 200 | `/career/roles/finance-01-07` | 1 | `https://socthink.cn/career/roles/finance-01-07` | 9 |
| `/career/roles/finance-01-08` | 200 | `/career/roles/finance-01-08` | 1 | `https://socthink.cn/career/roles/finance-01-08` | 9 |
| `/career/roles/finance-01-09` | 200 | `/career/roles/finance-01-09` | 1 | `https://socthink.cn/career/roles/finance-01-09` | 9 |
| `/career/roles/finance-01-10` | 200 | `/career/roles/finance-01-10` | 1 | `https://socthink.cn/career/roles/finance-01-10` | 9 |
| `/career/roles/health-01-01` | 200 | `/career/roles/health-01-01` | 1 | `https://socthink.cn/career/roles/health-01-01` | 6 |
| `/career/roles/health-01-02` | 200 | `/career/roles/health-01-02` | 1 | `https://socthink.cn/career/roles/health-01-02` | 6 |
| `/career/roles/health-01-03` | 200 | `/career/roles/health-01-03` | 1 | `https://socthink.cn/career/roles/health-01-03` | 6 |
| `/career/roles/health-01-04` | 200 | `/career/roles/health-01-04` | 1 | `https://socthink.cn/career/roles/health-01-04` | 6 |
| `/career/roles/health-01-05` | 200 | `/career/roles/health-01-05` | 1 | `https://socthink.cn/career/roles/health-01-05` | 5 |
| `/career/roles/health-01-06` | 200 | `/career/roles/health-01-06` | 1 | `https://socthink.cn/career/roles/health-01-06` | 5 |
| `/career/roles/industry-01-01` | 200 | `/career/roles/industry-01-01` | 1 | `https://socthink.cn/career/roles/industry-01-01` | 9 |
| `/career/roles/industry-01-02` | 200 | `/career/roles/industry-01-02` | 1 | `https://socthink.cn/career/roles/industry-01-02` | 9 |
| `/career/roles/industry-01-03` | 200 | `/career/roles/industry-01-03` | 1 | `https://socthink.cn/career/roles/industry-01-03` | 9 |
| `/career/roles/industry-01-04` | 200 | `/career/roles/industry-01-04` | 1 | `https://socthink.cn/career/roles/industry-01-04` | 9 |
| `/career/roles/industry-01-05` | 200 | `/career/roles/industry-01-05` | 1 | `https://socthink.cn/career/roles/industry-01-05` | 8 |
| `/career/roles/industry-01-06` | 200 | `/career/roles/industry-01-06` | 1 | `https://socthink.cn/career/roles/industry-01-06` | 8 |
| `/career/roles/industry-01-07` | 200 | `/career/roles/industry-01-07` | 1 | `https://socthink.cn/career/roles/industry-01-07` | 8 |
| `/career/roles/industry-01-08` | 200 | `/career/roles/industry-01-08` | 1 | `https://socthink.cn/career/roles/industry-01-08` | 8 |
| `/career/roles/industry-01-09` | 200 | `/career/roles/industry-01-09` | 1 | `https://socthink.cn/career/roles/industry-01-09` | 8 |
| `/career/roles/intelligence-01-01` | 200 | `/career/roles/intelligence-01-01` | 1 | `https://socthink.cn/career/roles/intelligence-01-01` | 10 |
| `/career/roles/intelligence-01-02` | 200 | `/career/roles/intelligence-01-02` | 1 | `https://socthink.cn/career/roles/intelligence-01-02` | 10 |
| `/career/roles/intelligence-01-03` | 200 | `/career/roles/intelligence-01-03` | 1 | `https://socthink.cn/career/roles/intelligence-01-03` | 10 |
| `/career/roles/intelligence-01-04` | 200 | `/career/roles/intelligence-01-04` | 1 | `https://socthink.cn/career/roles/intelligence-01-04` | 10 |
| `/career/roles/intelligence-01-05` | 200 | `/career/roles/intelligence-01-05` | 1 | `https://socthink.cn/career/roles/intelligence-01-05` | 9 |
| `/career/roles/intelligence-01-06` | 200 | `/career/roles/intelligence-01-06` | 1 | `https://socthink.cn/career/roles/intelligence-01-06` | 9 |
| `/career/roles/intelligence-01-07` | 200 | `/career/roles/intelligence-01-07` | 1 | `https://socthink.cn/career/roles/intelligence-01-07` | 9 |
| `/career/roles/intelligence-01-08` | 200 | `/career/roles/intelligence-01-08` | 1 | `https://socthink.cn/career/roles/intelligence-01-08` | 9 |
| `/career/roles/intelligence-01-09` | 200 | `/career/roles/intelligence-01-09` | 1 | `https://socthink.cn/career/roles/intelligence-01-09` | 9 |
| `/career/roles/intelligence-01-10` | 200 | `/career/roles/intelligence-01-10` | 1 | `https://socthink.cn/career/roles/intelligence-01-10` | 9 |
| `/career/roles/legal-01-01` | 200 | `/career/roles/legal-01-01` | 1 | `https://socthink.cn/career/roles/legal-01-01` | 6 |
| `/career/roles/legal-01-02` | 200 | `/career/roles/legal-01-02` | 1 | `https://socthink.cn/career/roles/legal-01-02` | 6 |
| `/career/roles/legal-01-03` | 200 | `/career/roles/legal-01-03` | 1 | `https://socthink.cn/career/roles/legal-01-03` | 6 |
| `/career/roles/legal-01-04` | 200 | `/career/roles/legal-01-04` | 1 | `https://socthink.cn/career/roles/legal-01-04` | 6 |
| `/career/roles/legal-01-05` | 200 | `/career/roles/legal-01-05` | 1 | `https://socthink.cn/career/roles/legal-01-05` | 5 |
| `/career/roles/legal-01-06` | 200 | `/career/roles/legal-01-06` | 1 | `https://socthink.cn/career/roles/legal-01-06` | 5 |
| `/career/roles/people-01-01` | 200 | `/career/roles/people-01-01` | 1 | `https://socthink.cn/career/roles/people-01-01` | 8 |
| `/career/roles/people-01-02` | 200 | `/career/roles/people-01-02` | 1 | `https://socthink.cn/career/roles/people-01-02` | 8 |
| `/career/roles/people-01-03` | 200 | `/career/roles/people-01-03` | 1 | `https://socthink.cn/career/roles/people-01-03` | 8 |
| `/career/roles/people-01-04` | 200 | `/career/roles/people-01-04` | 1 | `https://socthink.cn/career/roles/people-01-04` | 8 |
| `/career/roles/people-01-05` | 200 | `/career/roles/people-01-05` | 1 | `https://socthink.cn/career/roles/people-01-05` | 7 |
| `/career/roles/people-01-06` | 200 | `/career/roles/people-01-06` | 1 | `https://socthink.cn/career/roles/people-01-06` | 7 |
| `/career/roles/people-01-07` | 200 | `/career/roles/people-01-07` | 1 | `https://socthink.cn/career/roles/people-01-07` | 7 |
| `/career/roles/people-01-08` | 200 | `/career/roles/people-01-08` | 1 | `https://socthink.cn/career/roles/people-01-08` | 7 |
| `/career/roles/product-ops-01-01` | 200 | `/career/roles/product-ops-01-01` | 1 | `https://socthink.cn/career/roles/product-ops-01-01` | 8 |
| `/career/roles/product-ops-01-02` | 200 | `/career/roles/product-ops-01-02` | 1 | `https://socthink.cn/career/roles/product-ops-01-02` | 8 |
| `/career/roles/product-ops-01-03` | 200 | `/career/roles/product-ops-01-03` | 1 | `https://socthink.cn/career/roles/product-ops-01-03` | 8 |
| `/career/roles/product-ops-01-04` | 200 | `/career/roles/product-ops-01-04` | 1 | `https://socthink.cn/career/roles/product-ops-01-04` | 8 |
| `/career/roles/product-ops-01-05` | 200 | `/career/roles/product-ops-01-05` | 1 | `https://socthink.cn/career/roles/product-ops-01-05` | 7 |
| `/career/roles/product-ops-01-06` | 200 | `/career/roles/product-ops-01-06` | 1 | `https://socthink.cn/career/roles/product-ops-01-06` | 7 |
| `/career/roles/product-ops-01-07` | 200 | `/career/roles/product-ops-01-07` | 1 | `https://socthink.cn/career/roles/product-ops-01-07` | 7 |
| `/career/roles/product-ops-01-08` | 200 | `/career/roles/product-ops-01-08` | 1 | `https://socthink.cn/career/roles/product-ops-01-08` | 7 |
| `/career/roles/public-01-01` | 200 | `/career/roles/public-01-01` | 1 | `https://socthink.cn/career/roles/public-01-01` | 4 |
| `/career/roles/public-01-02` | 200 | `/career/roles/public-01-02` | 1 | `https://socthink.cn/career/roles/public-01-02` | 4 |
| `/career/roles/public-01-03` | 200 | `/career/roles/public-01-03` | 1 | `https://socthink.cn/career/roles/public-01-03` | 4 |
| `/career/roles/public-01-04` | 200 | `/career/roles/public-01-04` | 1 | `https://socthink.cn/career/roles/public-01-04` | 4 |
| `/career/roles/supply-01-01` | 200 | `/career/roles/supply-01-01` | 1 | `https://socthink.cn/career/roles/supply-01-01` | 4 |
| `/career/roles/supply-01-02` | 200 | `/career/roles/supply-01-02` | 1 | `https://socthink.cn/career/roles/supply-01-02` | 4 |
| `/career/roles/supply-01-03` | 200 | `/career/roles/supply-01-03` | 1 | `https://socthink.cn/career/roles/supply-01-03` | 4 |
| `/career/roles/supply-01-04` | 200 | `/career/roles/supply-01-04` | 1 | `https://socthink.cn/career/roles/supply-01-04` | 4 |
| `/competitions` | 200 | `/competitions` | 1 | `https://socthink.cn/competitions` | 187 |
| `/digital-purchase-policy` | 200 | `/digital-purchase-policy` | 1 | `https://socthink.cn/digital-purchase-policy` | 187 |
| `/digital-purchase-policy/v1` | 200 | `/digital-purchase-policy/v1` | 1 | 未发现 | 1 |
| `/events` | 200 | `/events` | 1 | `https://socthink.cn/events` | 3 |
| `/exam-planner` | 200 | `/exam-planner` | 1 | `https://socthink.cn/exam-planner` | 187 |
| `/exam/cemc-cayley-2026` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/cemc-fermat-2026` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/cemc-gauss-2026-grade-7` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/cemc-gauss-2026-grade-8` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/cemc-pascal-2026` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/de-2026-1113` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/de-2026-34` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/de-2026-56` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/de-2026-78` | 200 | `/login` | 1 | 未发现 | 2 |
| `/exam/de-2026-910` | 200 | `/login` | 1 | 未发现 | 2 |
| `/math-practice` | 200 | `/math-practice` | 1 | `https://socthink.cn/math-practice` | 2 |
| `/privacy` | 200 | `/privacy` | 1 | `https://socthink.cn/privacy` | 187 |
| `/resources` | 200 | `/resources` | 1 | `https://socthink.cn/resources` | 187 |
| `/resources/competitions/australian-amc` | 200 | `/resources/competitions/australian-amc` | 1 | `https://socthink.cn/resources/competitions/australian-amc` | 1 |
| `/resources/competitions/cemc` | 200 | `/resources/competitions/cemc` | 1 | `https://socthink.cn/resources/competitions/cemc` | 1 |
| `/resources/competitions/kangaroo` | 200 | `/resources/competitions/kangaroo` | 1 | `https://socthink.cn/resources/competitions/kangaroo` | 1 |
| `/resources/competitions/maa-amc` | 200 | `/resources/competitions/maa-amc` | 1 | `https://socthink.cn/resources/competitions/maa-amc` | 1 |
| `/resources/competitions/seamo` | 200 | `/resources/competitions/seamo` | 1 | `https://socthink.cn/resources/competitions/seamo` | 1 |
| `/review` | 200 | `/login` | 1 | 未发现 | 1 |
| `/search` | 200 | `/search` | 1 | 未发现 | 2 |
| `/shop` | 200 | `/shop` | 1 | 未发现 | 187 |
| `/shop/g6_thinking_original_2026_01` | 200 | `/shop/g6_thinking_original_2026_01` | 1 | 未发现 | 1 |
| `/shop/socthink_application_models_2026_batch01` | 200 | `/shop/socthink_application_models_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g1_original_2026_batch01` | 200 | `/shop/socthink_g1_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g2_original_2026_batch01` | 200 | `/shop/socthink_g2_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g3_original_2026_batch01` | 200 | `/shop/socthink_g3_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g4_original_2026_batch01` | 200 | `/shop/socthink_g4_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g5_original_2026_batch01` | 200 | `/shop/socthink_g5_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g6_original_2026_batch01` | 200 | `/shop/socthink_g6_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g7_original_2026_batch01` | 200 | `/shop/socthink_g7_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g8_original_2026_batch01` | 200 | `/shop/socthink_g8_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_g9_original_2026_batch01` | 200 | `/shop/socthink_g9_original_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_geometry_space_2026_batch01` | 200 | `/shop/socthink_geometry_space_2026_batch01` | 1 | 未发现 | 1 |
| `/shop/socthink_integer_patterns_2026_batch01` | 200 | `/shop/socthink_integer_patterns_2026_batch01` | 1 | 未发现 | 1 |
| `/skill-labs` | 200 | `/skill-labs` | 1 | `https://socthink.cn/skill-labs` | 187 |
| `/skill-labs/agent-foundations` | 200 | `/skill-labs/agent-foundations` | 1 | `https://socthink.cn/skill-labs/agent-foundations` | 6 |
| `/skill-labs/books` | 200 | `/skill-labs/books` | 1 | `https://socthink.cn/skill-labs/books` | 187 |
| `/skill-labs/books/3d-math-primer` | 200 | `/skill-labs/books/3d-math-primer` | 1 | `https://socthink.cn/skill-labs/books/3d-math-primer` | 1 |
| `/skill-labs/books/automate-the-boring-stuff-with-python` | 200 | `/skill-labs/books/automate-the-boring-stuff-with-python` | 1 | `https://socthink.cn/skill-labs/books/automate-the-boring-stuff-with-python` | 1 |
| `/skill-labs/books/designing-data-intensive-applications` | 200 | `/skill-labs/books/designing-data-intensive-applications` | 1 | `https://socthink.cn/skill-labs/books/designing-data-intensive-applications` | 1 |
| `/skill-labs/books/dive-into-deep-learning` | 200 | `/skill-labs/books/dive-into-deep-learning` | 1 | `https://socthink.cn/skill-labs/books/dive-into-deep-learning` | 1 |
| `/skill-labs/books/eloquent-javascript` | 200 | `/skill-labs/books/eloquent-javascript` | 1 | `https://socthink.cn/skill-labs/books/eloquent-javascript` | 1 |
| `/skill-labs/books/game-programming-patterns` | 200 | `/skill-labs/books/game-programming-patterns` | 1 | `https://socthink.cn/skill-labs/books/game-programming-patterns` | 1 |
| `/skill-labs/books/python-data-science-handbook` | 200 | `/skill-labs/books/python-data-science-handbook` | 1 | `https://socthink.cn/skill-labs/books/python-data-science-handbook` | 1 |
| `/skill-labs/books/sql-performance-explained` | 200 | `/skill-labs/books/sql-performance-explained` | 1 | `https://socthink.cn/skill-labs/books/sql-performance-explained` | 1 |
| `/skill-labs/books/the-rust-programming-language` | 200 | `/skill-labs/books/the-rust-programming-language` | 1 | `https://socthink.cn/skill-labs/books/the-rust-programming-language` | 1 |
| `/skill-labs/code-lab` | 200 | `/skill-labs/code-lab` | 1 | `https://socthink.cn/skill-labs/code-lab` | 3 |
| `/skill-labs/engineering-mock` | 200 | `/skill-labs/engineering-mock` | 1 | `https://socthink.cn/skill-labs/engineering-mock` | 2 |
| `/skill-labs/engineering/backend` | 200 | `/skill-labs/engineering/backend` | 1 | `https://socthink.cn/skill-labs/engineering/backend` | 1 |
| `/skill-labs/engineering/frontend` | 200 | `/skill-labs/engineering/frontend` | 1 | `https://socthink.cn/skill-labs/engineering/frontend` | 1 |
| `/skill-labs/engineering/qa` | 200 | `/skill-labs/engineering/qa` | 1 | `https://socthink.cn/skill-labs/engineering/qa` | 1 |
| `/skill-labs/sql-lab` | 200 | `/skill-labs/sql-lab` | 1 | `https://socthink.cn/skill-labs/sql-lab` | 5 |
| `/skill-labs/webgpu-basics` | 200 | `/skill-labs/webgpu-basics` | 1 | `https://socthink.cn/skill-labs/webgpu-basics` | 4 |
| `/terms` | 200 | `/terms` | 1 | `https://socthink.cn/terms` | 187 |
| `/verification` | 200 | `/verification` | 1 | `https://socthink.cn/verification` | 1 |

## 实际 4xx/5xx/请求失败
- 本轮抽查未遇到；不代表所有未扫描页面通过。

## 原目标跳转至登录页（需要身份测试，不算内容交付成功）
- `/review` → /login
- `/exam/cemc-cayley-2026` → /login
- `/exam/cemc-fermat-2026` → /login
- `/exam/cemc-gauss-2026-grade-7` → /login
- `/exam/cemc-gauss-2026-grade-8` → /login
- `/exam/cemc-pascal-2026` → /login
- `/exam/de-2026-1113` → /login
- `/exam/de-2026-34` → /login
- `/exam/de-2026-56` → /login
- `/exam/de-2026-78` → /login
- `/exam/de-2026-910` → /login

## 重复 main 地标（现场 HTML）
- 本轮公开页面未发现。

## 不应误判的条目

最终页面级归属以 [路由总账](SOCTHINK_PAGE_ROUTE_AUDIT.md) 及 [唯一 IA 总纲](SOCTHINK_SITE_ARCHITECTURE_MASTER.md) 为准。公开 200 不等于用户可以完成付款、考试和授权下载；这些另做具权限的真实回归。
