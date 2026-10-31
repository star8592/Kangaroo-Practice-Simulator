# SEO / GEO 竞赛专题页 P2 第一批（2026-10-31）

状态：**代码候选阶段**。本记录从既有 SEO+GEO ADR 和 P0 公网验收推进；CI、main 合并、生产发布、公网搜索页面验收需分别取得回执。

## 1. 定位与数据边界

本批次**不**批量生成 419/450 套试卷详情页，也不公开原卷、题目答案、付费材料。训练就绪与商业转载许可不同，目录只能展示原来就已经公开的元信息。

在既有 `src/lib/resource-catalog.ts` 只读投影上，增加 5 个真正有官方来源、彼此差异化的公开竞赛聚合页面：

| URL 后缀 | 竞赛 | 核查来源 |
|---|---|---|
| kangaroo | 袋鼠数学 | https://www.aksf.org/ |
| australian-amc | 澳洲 AMC | https://amt.edu.au/amc |
| maa-amc | 美国 MAA AMC | https://maa.org/student-programs/amc/ |
| cemc | 滑铁卢 CEMC | https://cemc.uwaterloo.ca/contests |
| seamo | SEAMO 新加坡数学 | https://www.seamo-official.org/page/guidelines |

以上页面路径前缀为 `/resources/competitions/`。所有来源内容均链接回主办方；没有声称官方合作、许可或可下载真题版权。

## 2. 搜索工程设计

- `src/lib/seo-resource-hubs.ts`：静态可信来源/简介与名单；**不成为第二份试卷/考试规则数据源**。
- `src/app/resources/competitions/[slug]/page.tsx`：Next.js 服务端渲染真实现有目录的公开元信息，来源注明，页内标准内部链接和明确版权边界，参数无效、无可用资源则 404。
- `/resources`：增设爬虫在初始 HTML 中可发现的专题链接，避免仅靠 JS 过滤列表寻找内容。
- `/sitemap.xml`：只把运行时有真实训练数据的竞赛专题加入公开 URL 集，不放任何训练会话、题目答案或权限路径。
- 内容随现有正式数据发布更新；**不复制题库，不加第二数据库/队列/定时任务/发布门禁**。
- 未来再有来源授权状态字段时，P2 #205 可增加逐卷独立详情；不足前优先建设高价值聚合页，而不是 400+ 薄页。

## 3. 正确性与验收合同

1. 五个候选路由在生产确有对应训练数据时，匿名 `GET` 返回 200，真实标题及正文可读，Canonical 与 Sitemap 一致；无数据则不索引、不导出假链接。
2. 所有训练链接沿用原 `/exam/{id}`，平台服务端权限、评分和支付行为不变。
3. 资料与版权界限准确：没有暗示与主办方合作、PDF 可销售或所有题目都有解析。
4. 本批次不随意写死某年的最新考试时间和不同国家的评分细则；引用官方当前信息时附真实来源。
5. 桌面、移动端 E2E 与现有 CI 真实通过；正式发布只走 main → 官方自动部署 → 原子切换/回滚 → 公网 SHA 与 GET 回执。
6. Google/百度/Bing 站长账户是否已验证及真实索引情况仍须另外核查，Sitemap 上线不等于被收录。
