# SOC THINK 公网真实链接抽查（只读抓取）

时间（UTC）：2026-11-03T02:11:48Z。原始基址：https://socthink.cn。脚本：scripts/audit_site_public_crawl.py。实测生产部署版本：`5ad145324c867f6d3231a5bc8afc39e6f433553f`；主分支随后有新的逐页整改，故本表属于**整改前公网基线快照**，不得误当作最新代码仍存在这些缺陷。

这不是完整私有权限 E2E，也不是对动态试卷/商品实例的全量验证。只读取公开、匿名、GET 的 HTML/站点地图；登录、订单、管理、报告、API、下载等敏感或状态页明确跳过，不能据此认定它们是孤儿。

## 概况

- 共抽查：117 个公开站内 URL；当前脚本上限：150；Sitemap 发现：37；状态分布：{"200": 115, "307": 2}。
- 匿名检索到多主地标页面：7；被本轮其他页面内链发现为 0 的条目：1（不代表确定孤儿页，可能是 Sitemap 入口）。
- 站点地图读取异常：无。
- 原始内容最终跳转到 /login 的页面：11。这类 HTTP 200 是**登录页**，不能计入原页面已成功展示。

## 逐 URL 现场验证

| URL | HTTP | 最终路径 | 页面 main 数 | canonical | 已发现站内入口数 |
| --- | --- | --- | ---: | --- | ---: |
| `/` | 200 | `/` | 1 | `https://socthink.cn` | 115 |
| `/arithmetic` | 307 | `/arithmetic` | - | 未发现 | 3 |
| `/arithmetic/print` | 307 | `/arithmetic/print` | - | 未发现 | 1 |
| `/assessment-center` | 200 | `/assessment-center` | 1 | `https://socthink.cn/assessment-center` | 115 |
| `/assessment-center/about` | 200 | `/assessment-center/about` | 1 | `https://socthink.cn/assessment-center/about` | 8 |
| `/assessment-center/advanced-reasoning-40` | 200 | `/assessment-center/advanced-reasoning-40` | 1 | `https://socthink.cn/assessment-center/advanced-reasoning-40` | 2 |
| `/assessment-center/career-aptitude-40` | 200 | `/assessment-center/career-aptitude-40` | 1 | `https://socthink.cn/assessment-center/career-aptitude-40` | 3 |
| `/assessment-center/career-interest-exploration-30` | 200 | `/assessment-center/career-interest-exploration-30` | 1 | `https://socthink.cn/assessment-center/career-interest-exploration-30` | 2 |
| `/assessment-center/ipip-big-five-50-cn-preview` | 200 | `/assessment-center/ipip-big-five-50-cn-preview` | 1 | `https://socthink.cn/assessment-center/ipip-big-five-50-cn-preview` | 3 |
| `/assessment-center/methodology` | 200 | `/assessment-center/methodology` | 1 | `https://socthink.cn/assessment-center/methodology` | 115 |
| `/assessment-center/reading-practice-16` | 200 | `/assessment-center/reading-practice-16` | 1 | `https://socthink.cn/assessment-center/reading-practice-16` | 2 |
| `/assessment-center/reasoning-practice-20` | 200 | `/assessment-center/reasoning-practice-20` | 1 | `https://socthink.cn/assessment-center/reasoning-practice-20` | 2 |
| `/assessment-center/report-preview` | 200 | `/assessment-center/report-preview` | 1 | `https://socthink.cn/assessment-center/report-preview` | 1 |
| `/assessment-center/work-style-24` | 200 | `/assessment-center/work-style-24` | 1 | `https://socthink.cn/assessment-center/work-style-24` | 2 |
| `/assessment-center/work-values-30` | 200 | `/assessment-center/work-values-30` | 1 | `https://socthink.cn/assessment-center/work-values-30` | 2 |
| `/assessment-center/workplace-sjt-24` | 200 | `/assessment-center/workplace-sjt-24` | 1 | `https://socthink.cn/assessment-center/workplace-sjt-24` | 2 |
| `/assessments` | 200 | `/assessments` | 1 | `https://socthink.cn/assessments` | 115 |
| `/career` | 200 | `/career` | 1 | `https://socthink.cn/career` | 115 |
| `/career/companies` | 200 | `/career/companies` | 2 | `https://socthink.cn/career/companies` | 1 |
| `/career/exams/agent-engineering-paper-2026q4-v1` | 200 | `/career/exams/agent-engineering-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/agent-engineering-paper-2026q4-v1` | 3 |
| `/career/exams/operations-paper-2026q4-v1` | 200 | `/career/exams/operations-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/operations-paper-2026q4-v1` | 2 |
| `/career/exams/procurement-paper-2026q4-v1` | 200 | `/career/exams/procurement-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/procurement-paper-2026q4-v1` | 2 |
| `/career/exams/quality-paper-2026q4-v1` | 200 | `/career/exams/quality-paper-2026q4-v1` | 1 | `https://socthink.cn/career/exams/quality-paper-2026q4-v1` | 2 |
| `/career/guides/manufacturing-fmea-handbook` | 200 | `/career/guides/manufacturing-fmea-handbook` | 1 | `https://socthink.cn/career/guides/manufacturing-fmea-handbook` | 2 |
| `/career/guides/retail-campaign-roi-handbook` | 200 | `/career/guides/retail-campaign-roi-handbook` | 1 | `https://socthink.cn/career/guides/retail-campaign-roi-handbook` | 2 |
| `/career/guides/supplier-decision-handbook` | 200 | `/career/guides/supplier-decision-handbook` | 1 | `https://socthink.cn/career/guides/supplier-decision-handbook` | 1 |
| `/career/interviews` | 200 | `/career/interviews` | 1 | `https://socthink.cn/career/interviews` | 1 |
| `/career/roles/business-01-01` | 200 | `/career/roles/business-01-01` | 1 | `https://socthink.cn/career/roles/business-01-01` | 4 |
| `/career/roles/business-01-02` | 200 | `/career/roles/business-01-02` | 1 | `https://socthink.cn/career/roles/business-01-02` | 4 |
| `/career/roles/business-01-03` | 200 | `/career/roles/business-01-03` | 1 | `https://socthink.cn/career/roles/business-01-03` | 4 |
| `/career/roles/business-01-04` | 200 | `/career/roles/business-01-04` | 1 | `https://socthink.cn/career/roles/business-01-04` | 4 |
| `/career/roles/construction-01-01` | 200 | `/career/roles/construction-01-01` | 1 | `https://socthink.cn/career/roles/construction-01-01` | 4 |
| `/career/roles/construction-01-02` | 200 | `/career/roles/construction-01-02` | 1 | `https://socthink.cn/career/roles/construction-01-02` | 4 |
| `/career/roles/construction-01-03` | 200 | `/career/roles/construction-01-03` | 1 | `https://socthink.cn/career/roles/construction-01-03` | 4 |
| `/career/roles/construction-01-04` | 200 | `/career/roles/construction-01-04` | 1 | `https://socthink.cn/career/roles/construction-01-04` | 4 |
| `/career/roles/creative-01-01` | 200 | `/career/roles/creative-01-01` | 1 | `https://socthink.cn/career/roles/creative-01-01` | 4 |
| `/career/roles/creative-01-02` | 200 | `/career/roles/creative-01-02` | 1 | `https://socthink.cn/career/roles/creative-01-02` | 4 |
| `/career/roles/creative-01-03` | 200 | `/career/roles/creative-01-03` | 1 | `https://socthink.cn/career/roles/creative-01-03` | 4 |
| `/career/roles/creative-01-04` | 200 | `/career/roles/creative-01-04` | 1 | `https://socthink.cn/career/roles/creative-01-04` | 4 |
| `/career/roles/digital-01-01` | 200 | `/career/roles/digital-01-01` | 1 | `https://socthink.cn/career/roles/digital-01-01` | 4 |
| `/career/roles/digital-01-02` | 200 | `/career/roles/digital-01-02` | 1 | `https://socthink.cn/career/roles/digital-01-02` | 4 |
| `/career/roles/digital-01-03` | 200 | `/career/roles/digital-01-03` | 1 | `https://socthink.cn/career/roles/digital-01-03` | 4 |
| `/career/roles/digital-01-04` | 200 | `/career/roles/digital-01-04` | 1 | `https://socthink.cn/career/roles/digital-01-04` | 4 |
| `/career/roles/finance-01-01` | 200 | `/career/roles/finance-01-01` | 1 | `https://socthink.cn/career/roles/finance-01-01` | 4 |
| `/career/roles/finance-01-02` | 200 | `/career/roles/finance-01-02` | 1 | `https://socthink.cn/career/roles/finance-01-02` | 4 |
| `/career/roles/finance-01-03` | 200 | `/career/roles/finance-01-03` | 1 | `https://socthink.cn/career/roles/finance-01-03` | 4 |
| `/career/roles/finance-01-04` | 200 | `/career/roles/finance-01-04` | 1 | `https://socthink.cn/career/roles/finance-01-04` | 4 |
| `/career/roles/health-01-01` | 200 | `/career/roles/health-01-01` | 1 | `https://socthink.cn/career/roles/health-01-01` | 4 |
| `/career/roles/health-01-02` | 200 | `/career/roles/health-01-02` | 1 | `https://socthink.cn/career/roles/health-01-02` | 4 |
| `/career/roles/health-01-03` | 200 | `/career/roles/health-01-03` | 1 | `https://socthink.cn/career/roles/health-01-03` | 4 |
| `/career/roles/health-01-04` | 200 | `/career/roles/health-01-04` | 1 | `https://socthink.cn/career/roles/health-01-04` | 4 |
| `/career/roles/industry-01-01` | 200 | `/career/roles/industry-01-01` | 1 | `https://socthink.cn/career/roles/industry-01-01` | 4 |
| `/career/roles/industry-01-02` | 200 | `/career/roles/industry-01-02` | 1 | `https://socthink.cn/career/roles/industry-01-02` | 4 |
| `/career/roles/industry-01-03` | 200 | `/career/roles/industry-01-03` | 1 | `https://socthink.cn/career/roles/industry-01-03` | 4 |
| `/career/roles/industry-01-04` | 200 | `/career/roles/industry-01-04` | 1 | `https://socthink.cn/career/roles/industry-01-04` | 4 |
| `/career/roles/intelligence-01-01` | 200 | `/career/roles/intelligence-01-01` | 1 | `https://socthink.cn/career/roles/intelligence-01-01` | 3 |
| `/career/roles/intelligence-01-02` | 200 | `/career/roles/intelligence-01-02` | 1 | `https://socthink.cn/career/roles/intelligence-01-02` | 3 |
| `/career/roles/intelligence-01-03` | 200 | `/career/roles/intelligence-01-03` | 1 | `https://socthink.cn/career/roles/intelligence-01-03` | 3 |
| `/competitions` | 200 | `/competitions` | 1 | `https://socthink.cn/competitions` | 115 |
| `/digital-purchase-policy` | 200 | `/digital-purchase-policy` | 1 | `https://socthink.cn/digital-purchase-policy` | 115 |
| `/digital-purchase-policy/v1` | 200 | `/digital-purchase-policy/v1` | 1 | 未发现 | 1 |
| `/events` | 200 | `/events` | 1 | `https://socthink.cn/events` | 3 |
| `/exam-planner` | 200 | `/exam-planner` | 1 | `https://socthink.cn/exam-planner` | 115 |
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
| `/math-practice` | 200 | `/math-practice` | 1 | `https://socthink.cn/math-practice` | 0 |
| `/privacy` | 200 | `/privacy` | 1 | `https://socthink.cn/privacy` | 115 |
| `/resources` | 200 | `/resources` | 1 | `https://socthink.cn/resources` | 115 |
| `/resources/competitions/australian-amc` | 200 | `/resources/competitions/australian-amc` | 1 | `https://socthink.cn/resources/competitions/australian-amc` | 1 |
| `/resources/competitions/cemc` | 200 | `/resources/competitions/cemc` | 1 | `https://socthink.cn/resources/competitions/cemc` | 1 |
| `/resources/competitions/kangaroo` | 200 | `/resources/competitions/kangaroo` | 1 | `https://socthink.cn/resources/competitions/kangaroo` | 1 |
| `/resources/competitions/maa-amc` | 200 | `/resources/competitions/maa-amc` | 1 | `https://socthink.cn/resources/competitions/maa-amc` | 1 |
| `/resources/competitions/seamo` | 200 | `/resources/competitions/seamo` | 1 | `https://socthink.cn/resources/competitions/seamo` | 1 |
| `/review` | 200 | `/login` | 1 | 未发现 | 1 |
| `/search` | 200 | `/search` | 1 | 未发现 | 2 |
| `/shop` | 200 | `/shop` | 1 | 未发现 | 115 |
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
| `/skill-labs` | 200 | `/skill-labs` | 1 | `https://socthink.cn/skill-labs` | 115 |
| `/skill-labs/agent-foundations` | 200 | `/skill-labs/agent-foundations` | 2 | `https://socthink.cn/skill-labs/agent-foundations` | 6 |
| `/skill-labs/books` | 200 | `/skill-labs/books` | 1 | `https://socthink.cn/skill-labs/books` | 115 |
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
| `/skill-labs/engineering-mock` | 200 | `/skill-labs/engineering-mock` | 2 | `https://socthink.cn/skill-labs/engineering-mock` | 2 |
| `/skill-labs/engineering/backend` | 200 | `/skill-labs/engineering/backend` | 2 | `https://socthink.cn/skill-labs/engineering/backend` | 1 |
| `/skill-labs/engineering/frontend` | 200 | `/skill-labs/engineering/frontend` | 2 | `https://socthink.cn/skill-labs/engineering/frontend` | 1 |
| `/skill-labs/engineering/qa` | 200 | `/skill-labs/engineering/qa` | 2 | `https://socthink.cn/skill-labs/engineering/qa` | 1 |
| `/skill-labs/sql-lab` | 200 | `/skill-labs/sql-lab` | 1 | `https://socthink.cn/skill-labs/sql-lab` | 5 |
| `/skill-labs/webgpu-basics` | 200 | `/skill-labs/webgpu-basics` | 2 | `https://socthink.cn/skill-labs/webgpu-basics` | 4 |
| `/terms` | 200 | `/terms` | 1 | `https://socthink.cn/terms` | 115 |

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
- `/skill-labs/agent-foundations`：2
- `/skill-labs/webgpu-basics`：2
- `/skill-labs/engineering-mock`：2
- `/career/companies`：2
- `/skill-labs/engineering/backend`：2
- `/skill-labs/engineering/frontend`：2
- `/skill-labs/engineering/qa`：2

## 不应误判的条目
- `/math-practice`：本轮内链未命中，可能由 sitemap、动态链接或历史外链进入；需判断后才能认定孤儿。

最终页面级归属以 [路由总账](SOCTHINK_PAGE_ROUTE_AUDIT.md) 及 [唯一 IA 总纲](SOCTHINK_SITE_ARCHITECTURE_MASTER.md) 为准。公开 200 不等于用户可以完成付款、考试和授权下载；这些另做具权限的真实回归。
