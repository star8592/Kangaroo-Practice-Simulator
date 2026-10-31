# SOC THINK SEO/GEO：首页机构实体与竞赛页面路径的结构化数据（2026-11-01）

状态：正式代码候选，必须经过 PR CI、main 发布和公网验证才能声称已上线。

## 决策依据
- Google 机构结构化数据：https://developers.google.com/search/docs/appearance/structured-data/organization
- Google 面包屑结构化数据：https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- Google 通用结构化数据政策：https://developers.google.com/search/docs/appearance/structured-data/sd-policies

## 本批选择

1. 首页采用 Organization JSON-LD，仅包含已知站点品牌 SOC THINK、规范域名、已有真实品牌介绍，不编造注册公司名称、地址、客服电话、Logo 或社交账号。
2. 五个竞赛资源专题页采用 BreadcrumbList，JSON-LD 反映页面**实际可见**的「首页 → 试卷资料 → 当前竞赛专题」路径；三层绝对 HTTPS URL，最后一层与规范 Canonical 一致。
3. 不添加 FAQPage 诱导富结果，不添加虚假的 Review/Rating/Product、考试授权或搜索平台认证字段。
4. 不改变数据权威源、公共导航、考试权限、收费或页面访问路径。结构化数据仅增强原有合法公开的页面说明。

## 交付验收

- [ ] 构建与现有三组 PR CI 成功。
- [ ] 正式 main CI 完成、唯一发布器 candidate/public release pass，公网 SHA 一致。
- [ ] 首页 HTML 能读取一条合法 Organization JSON-LD。
- [ ] 五个专题各读取一条合法 BreadcrumbList，ListItem 的 name / item 与实际面包屑、Canonical 对应。
- [ ] 不出现假机构字段与受保护用户/试卷数据。
- [ ] Google Rich Results Test、Search Console 确认放在后续有可用平台访问权限时进行；有正确 JSON-LD 也**不等于一定显示富结果**。

补充：结构化数据是辅助机器理解的信号，不代替高质量内容、可抓取性、真实来源和站长后台性能数据。
