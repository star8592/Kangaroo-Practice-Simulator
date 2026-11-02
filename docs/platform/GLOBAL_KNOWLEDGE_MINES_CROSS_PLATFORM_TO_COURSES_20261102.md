# SOC THINK｜全球知识矿脉：X × YouTube × Reddit × 海外岗位 × GitHub → 原创课程、实操与考试
版本：2026-11-02 首批市场证据登记；状态：**研究与选品稿，不等于课程完成或商城已上架**。

## 0. 本次澄清的产品定位
用户要求把全球前沿技术/教程/新职业情报**转化为现有 SOC THINK 的中文原创课程、训练、正式模拟考试与资料商品**；非新建独立SaaS或单纯研究LLM工具。

- **信号源（做什么）**：X / YouTube / Reddit / 海外招聘与技能报告 / Github / Hacker News / Product Hunt。
- **价值加工（为什么收费）**：追溯官方原版 → 独立复现 → 结构化、中文化、工程化 → 创作原创示例 → 练习/正式模拟笔试/实操评价 → 审核后上架。
- **售卖权利**：我们售卖自创的教学组织、练习、代码、解题讲解、验收与支持，不重新打包第三方收费视频/整套课程/未获转授权的项目。技术事实可学习，表现形式、视频、配图、文本、受保护代码须遵守相关许可；翻译通常涉及改编授权。

## 1. 六个来源的角色
| 来源 | 核心要回答 | 搜寻标准 | 反证 |
|---|---|---|---|
| X | 最近冒出了什么技术？ | 原作者第一手帖+项目或论文链接、具体发布日期 | 纯营销/带货、无代码无对照 |
| YouTube | 能否教会普通人做出来？ | 演示/步骤/资源与环境、实际生成物 | 精剪demo；私有节点/付费引流；更新失效 |
| Reddit | 实际学习和交付卡在哪？ | 真实提问、具体硬件、日志、重复出现的困难 | 自我营销、水帖、单案例不代表普遍需求 |
| Upwork/LinkedIn/招聘 | 哪些技能与工作任务对应？ | 研究报告的样本/周期、岗位描述与具体交付 | 搜索热度不等于成交；美国需求不自动等于国内 |
| GitHub/官方手册 | 是否有可复现技术底座？ | commit/tag/License/dependencies/docs/issues | 星数不等于生产成熟；许可或运行依赖不清楚 |
| Show HN/Product Hunt | 下一代产品形态是什么？ | 有demo+实际交互+真实使用反馈 | 发布热度≠市场付费 |

## 2. 本轮可验证的样本（来源、事实与对应课题）
S01 | **真实签约需求** | Upwork 官方《In-Demand Skills 2026》，2026-02-04，https://www.upwork.com/research/in-demand-skills-2026
- 其2025美国平台**已签约自由职业项目收入**口径：AI Video Generation & Editing +329%；AI Integration +178%；AI Data Annotation & Labeling +154%；AI Chatbot Development +71%。是Upwork特定类别增速，不是全市场量、不是中国数据，也不是未来增速承诺。
- 产品选题：AI视频生产与交付、企业AI集成、数据标注/质量、智能客服项目实现。所有技能必须再看实际工作任务与国内意愿。

S02 | **近期搜索与岗位变化** | Upwork官方2026-10-14《September 2026 Monthly Hiring Insights》https://www.upwork.com/research/upwork-monthly-hiring-insights-september-2026
- 9月“AI video”搜索领跑AI相关关键词；“AI SaaS developer”同比搜索增长率领先，AI Agent developer / automation / architect等亦上升。**搜索增长不是成交或收入**。
- 可开发：从“一个视频工具教学”升级到“AI视频全流程工单交付”；AI SaaS/Agent 的技能考试。

S03 | **职业技能趋势佐证** | LinkedIn官方 2026-02-24 Skills on the Rise https://news.linkedin.com/2026/Skills-on-the-rise-2026
- 用于增加“技能标签与职业能力体系”的独立来源，其方法同时考虑技能获取与招聘成功；**不能直接推导具体职位数量**。

S04 | **YouTube作品型教程** | 2026-01-01 视频，Wan2.2 GGUF + ComfyUI：https://www.youtube.com/watch?v=vwu0KwxVNGo
- 视频描述给出节点与双阶段采样、16GB显存RTX 4060 Ti环境及作者自报耗时，尚未由我方复测。需要检查对应工作流版权/模型许可/节点版本和最终质量。
- 可开发原创「单卡ComfyUI AI视频工作流：导入→生成→合成→排障」，在Z890实跑后记录配置、成本、失败案例。**不可直接卖作者workflow或录制视频**。

S05 | **Reddit真实作品模式** | 2026-10-06 r/comfyui「local AI filmmaking pipeline」https://www.reddit.com/r/comfyui/comments/1wz9qy1/we_built_a_working_local_ai_filmmaking_pipeline/
- 发帖者自报 RTX4070/12GB、script→scenes→storyboard→reference images→video→voice→editing 的本地工作流；为单团队自述，不能证明普适可行。
- 产品：AI短片全流程训练营，连贯镜头风格与分镜、配音、剪辑验收，不只单节点教程。

S06 | **Reddit痛点验证** | 2026-03-28 r/comfyui 视频机构从业者提问：https://www.reddit.com/r/comfyui/comments/1s6f4uw/anyone_here_actually_using_comfyui_in_a_way_thats/
- 真实问题：能做酷炫demo但难判断能否用于商业生产；开源和API在成本、稳定性、控制权之间选择困难。属于个别陈述，作为痛点假说。
- 产品：「ComfyUI本地vs API工作流成本/品质/稳定性对照实训」，提供可复核实验而非营销结论。

S07 | **Reddit 3D工程反直觉案例** | 2026-07-31 r/threejs WebGPU vs WebGL：https://www.reddit.com/r/threejs/comments/1vbj3ca/we_tested_webgpu_vs_webgl_in_a_real_threejs_scene/
- 作者自报在特定集成GPU上WebGPU帧率未必更高，但绘制调用减少；未经第三方复验。教学价值是**性能结论依赖设备/场景**。
- 产品：「Three.js WebGL→WebGPU迁移与真实性能测试」，交付可运行场景、跨设备指标、用户可独立复算的数据，不宣传WebGPU一定更快。

S08 | **Reddit Agent学习路线的缺口** | 2026-04-19 r/AI_Agents https://www.reddit.com/r/AI_Agents/comments/1sps50u/ai_agent_roadmap_for_developers_who_can_code_but/
- 原帖反映“教程碎片、学习先后顺序不清楚”的个人体验。课程应从工作流/Agent边界、模型工具记忆、实战、验收逐级推进。
- 产品：「AI Agent岗位能力训练：从工具调用到生产验收」，基于官方开源技术自写教材，不照搬网友路线图。

S09 | **Hacker News新项目展台** | https://news.ycombinator.com/show
- 提供每日新Demo/实测反馈采样，初次登记时不将任何单一Show HN的热度视为付费证据。

S10 | **平台采集条款** | https://developers.google.com/youtube/v3/docs/search 与 https://redditinc.com/policies/data-api-terms （Reddit 2026-07-20修订）
- YouTube使用受配额与政策约束的官方API做元数据发现；视频/音频与讲解内容另查权属。
- Reddit API商业使用可能需另行协议；优先**低频研究/公开页面查证/聚合问题类型**，不未经许可进行商业规模抓取、不保存/出售整库原文、不挪作训练集。
- 版权基础：https://support.google.com/youtube/answer/2797466 ，创作者视频的翻译/改编不当然取得商业授权。

## 3. 直接给SOC THINK的首批商品种子（待实操验收）
1. **《AI 视频工作流：ComfyUI 本地成片实战》**：3段原创镜头+工程JSON+环境/显存记录+导出视频；24题正式技能模拟卷/实际成片评分；X/YouTube/Reddit/官方仓库佐证。P0。
2. **《AI Agent 工程与生产级验收》**：带权限的工具调用、MCP、失败重试、可重放日志与测试；24题正式卷+执行型实操。P0。
3. **《Three.js × WebGPU 网页3D实战》**：自创交互场景、跨Chrome/Android性能对照、视觉差异说明；24题卷+场景作品。P0。
4. **《AI SaaS 开发者岗位能力训练》**：从需求、API接入、状态机、收费/权限、可靠性到上线证据；完整工单型实操。P1，先从实际岗位职责采样。
5. **《AI视频生成成本与质量评估》**：本地/云两种方法、统一素材与标尺、公示成本与成功率；实操报告。P1。
6. **《数据标注与LLM数据治理实训》**：合法数据、去重、标签质量、泄漏与一致性核查；课程+原创评价样例。P1。

P0/P1表示**内容制作和用户实验优先级**，非商品质量评级与已证实销售热度。其它热门题目入候选池，不抢占正式上架资源。

## 4. 选题评分（满分100；评分是启发式，需保留证据）
- **可观察的付费/招聘任务** 30分（合同/岗位实际要求优于点赞和浏览）
- **中国用户有实操用途的证据** 25分（搜索词/客服问询/实际成交与竞品）
- **可由我方独立复现并交付** 20分（硬件、许可、资源、时间成本）
- **独创性与结构化提升** 15分（教学方案、工程/训练/评分比免费源多什么）
- **技术新鲜度** 10分（版本、发布日期、替代情况）
任何版权不清、平台授权不满足、试题技术错误、交付无法复现的候选：**不能上架，且不得用高评分绕过**。高热度低支付证据保留研究状态。

## 5. 一个技术主题变成商品的制造流程
1. 入口采样：source_url, original_author, published_at, observed_at, language, source_type, links, self_promotion, claims, demand_signal。
2. 追溯官方原始文档/代码/许可证/更改历史；标记 fact / author_reported / independent_verified / hypothesis。
3. 筛选实际岗位/客户任务与中国市场可用性；不随意把海外热词写成国内岗位需求。
4. 使用自有设备及数据进行复现，保存环境锁、版本、结果截图/日志、失败点和耗时成本；做原创讲义和独立素材。
5. 编制正式卷（当前方向24题/45分钟为**候选编辑规范**，须按职业技能实际性质定题型），答案与客户端分离，实操单独评分；合格后才可称为正式训练。
6. 在现有 SOC THINK /career、/skill-labs、商城复用统一微信账号、支付与权益；商品详情真实目录、样例、下载格式、适用版本、交付边界；核查支付→授权→下载端到端。
7. 上线后监测：索引收录/关键词/访问→试读→开始考试→成交→完成率→退款或投诉/质量反馈；数据未接入不得宣称收入。
8. 更新触发：重要官方版本发布、许可证变化、源链接失效、示例无法复现、岗位技能要求明显变化。保留版本号与改动说明。

## 6. 三批实施范围
- **第一批**只做 3 门：AI视频、Agent、WebGPU（同样直接服务当前内部项目实用开发）；每门1个真正可运行的原创项目+完整课程主线+正规训练和考核。无过度门禁，只保留必要的产品质量验收与出错回退。
- **第二批**扩展AI SaaS、数据治理、视频成本评估，并取得真实中国用户意愿与订单数据。
- **第三批**根据实际成交和内容维护成本扩大类别，而不是以条目数替代商品质量。

## 7. 保留与现有项目的边界
- 唯一用户入口与商城：现有 SOC THINK，不建副站。
- 工程项目可共用基础技术，但教程中的截图/例程/数据应专为教学而自创，避免暴露其他生产系统的客户与凭据。
- 此文档补充 PR #255 与 Issue #256；**尚未上线、尚未有课程交付包、未开新的定时抓取任务**。
