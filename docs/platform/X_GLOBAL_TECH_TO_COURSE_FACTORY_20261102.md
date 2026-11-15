# SOC THINK｜X 全球新技术课程货源工厂（2026-11-02，v1 草案）

> 状态：研究稿 / 待编辑验收 / **未上架、未发布、未收费**。唯一产品归属：现有 SOC THINK（socthink.cn）职业教程、技能训练、正式模拟考试、数字资料商城。**不建第二网站、第二支付或第二账号**。
>
> 目的：从 X/Twitter 的中英文前沿演示、技术研究与教学帖子出发，沿“创作者→官方文档→开源代码/授权案例→国内职业需求→原创中文教程→可复现实操→正式考试→真实付费”加工出高质量课程。关注最新3–12个月，技术规则优先当前版本；有价值的经典基础知识可保留，但不可标“2026新技术”。

## A. 定位纠偏

用户提供的 [NFT_Chen 关于唐杰《高级机器学习》的帖子](https://x.com/NFT_Chen/status/2116896112435241177) 应先作为“**课程和考试内容种子**”，不应擅自推导为“立即另外开发14个 AI SaaS 网站”。X 是发现入口而不是内容权威：必须找到原作者、原始技术资料、源代码、许可证/引用许可，并结合国内客户需求编写**自己原创、可运行、有题库的中文训练内容**。

课程不等于测评，不等于官方认证：考试一律称“SOCTHINK 原创技能模拟考试/项目考核”，不得暗示清华、Hugging Face、Blender 等机构授权或颁证。不是官方岗位笔试；只有有证据的企业岗位职责可以映射为岗位训练。

## B. 内容供应链（复用现有模块，不平行造系统）

```text
X 原帖 / 官方创作者账号 / 海外技术论坛 / GitHub releases
  → 收录候选（链接/作者/时间/截图可选、热度不能代替真实性）
  → 访问原站查事实/原始 API / changelog / 运行环境 / 版权
  → 课程化选题（中文学习目标、技能依赖、受众、难度、交付物）
  → 原创中文内容 + 自制图/录屏/代码/样本 + 教师/工程审核
  → 练习项目与自动评分（隔离沙箱、固定输入、失败解释）
  → 正式考试（题库版本、规范时长、明确规则、服务端评分）
  → 内容验收通过，复用现有 Catalog / Commerce / Attempt / Grade
  → 在已有 /career、/skill-labs、商城中真实上架
  → 既有 SEO/GEO 公开只读投影，观察真实收录、访问与成交
```

任何“待调研”条目不生成可付款 SKU；标题、目录、可下载文件格式、容量、适用版本、示例和边界，必须从已交付实物反推。按现有 docs/platform/CAREER_DEMAND_FIRST_SUPPLY_SYSTEM_V2_20261101.md 和 docs/platform/CAREER_FORMAL_EXAM_BANK_20261101.md 执行。旧6题版本已经废弃，**不得复活/改名为热身卷**。技术技能课程的项目考核可含编程/作品交付，不能机械地把24选择题等同于能力认证；新增正式客观卷建议以24题为初始设计候选，须符合本身技能任务。

## C. 第一期 12 个可开发 SKU 候选（全部未上架）

| id | 优先级 | 中文课程/训练名称（候选） | 参考种子/核验链接 | 成品交付与考试 |
|---|---|---|---|---|
| X01 | P0 | 大模型训练与后训练实战：Tokenizer、SFT、DPO、RL | 用户 X 原帖；[HF smol-course](https://github.com/huggingface/smol-course)、[TRL](https://github.com/huggingface/trl) | 原创中文讲义、受限小模型实验、评测表；模拟24题+实验记录 |
| X02 | P0 | AI Agent 与 MCP 工程实践 | [HF Agents Course](https://huggingface.co/agents-course)、[MCP规范](https://modelcontextprotocol.io/specification) | 原创工具调用链、可复现任务、越权与失败验收；限时编程/任务考试 |
| X03 | P0 | Three.js WebGPU + TSL 视觉特效 | [Chiro X原帖](https://x.com/chirovisuals/status/2079197556706288008)、[Codrops](https://tympanus.net/codrops/2026/08/11/exploring-procedural-geometry-with-three-js-and-webgpu/)、[原作者开源代码](https://github.com/achrefelouafi/GeometryPainterThreeJS)、[官方指南](https://threejs.org/manual/pages/webgpurenderer) | 原创交互3D场景、桌面/手机帧率对照、性能考核 |
| X04 | P0 | ComfyUI AI视频工作流：画面一致性与合成 | [ComfyUI官方文档](https://docs.comfy.org/)、[官方实例](https://comfyanonymous.github.io/ComfyUI_examples/) | 可导入workflow、素材许可清单、自制演示视频、失败排错题 |
| X05 | P0 | Blender 5.2 几何节点与程序动画 | [Blender 5.2 LTS发布](https://www.blender.org/press/blender-5-2-lts-release/) | 自制场景.blend、节点图、输出动画、独立实操打分 |
| X06 | P1 | 语料治理：去重、质量过滤与数据血缘 | [HF DataTrove](https://github.com/huggingface/datatrove)、[NVIDIA Curator](https://github.com/NVIDIA-NeMo/Curator) | 原创示例语料、数据清洗脚本、审计表、复测 |
| X07 | P1 | RAG：文档解析、召回与引用准确性 | [LlamaIndex官方文档](https://docs.llamaindex.ai/)、[LangChain官方文档](https://docs.langchain.com/) | 授权小语料库、检索正确率与引用检测、实操卷 |
| X08 | P1 | Python 自动化 + API 工具开发 | [Python官方文档](https://docs.python.org/3/)、[FastAPI官方文档](https://fastapi.tiangolo.com/) | 任务脚本、可复用单元测试、可交付报告 |
| X09 | P1 | AI 视频镜头语言与FFmpeg自动剪辑 | [FFmpeg官方文档](https://ffmpeg.org/documentation.html)、[ComfyUI官方工作流](https://comfy.org/workflows) | 带授权素材的完整视频、剪辑工程、技术指标 |
| X10 | P1 | React Three Fiber 交互式网页3D | [R3F官方文档](https://r3f.docs.pmnd.rs/) | 可操作场景/组件及测试；当前v10 alpha不得当稳定正式版宣传 |
| X11 | P2 | LLM 性能基准与推理优化 | [vLLM](https://github.com/vllm-project/vllm)、[Triton](https://github.com/triton-lang/triton) | 真实硬件同条件测量、延迟/吞吐/显存报告 |
| X12 | P2 | AI 数据与多模态行业作品集训练 | [Hugging Face学习入口](https://huggingface.co/learn)、[NVIDIA生成式AI教学工具](https://developer.nvidia.com/teaching-kits) | 原创行业案例、技术取舍、作品集答辩量表 |

`sourceStatus`: 上表是网址与主题已核对的**技术种子**；不是12门完成的课程。原帖图片/视频如不能核实则标 UNKNOWN；X 帖子观点不可直接当事实，二次转述需查官方源。第三方付费课程不得搬运、翻译打包出售；项目代码要逐库查版权、依赖和模型授权。

## D. 建议的第一批课程内容规格

- **基础卡**：标题 8–18 字；一句目标；适合谁；先修知识；对应的软件/硬件与**版本日期**；预计练习投入、可取得的具体文件/技能；“不是官方认证”。
- **教程**：学习目标→核心概念→本地可运行原生示例→关键出错点→版本差异→练习任务→标准解法/审阅提示→一页查错卡。能直接上机，视频须有真实演示，不全由AI配音与幻灯片拼接。
- **考试**：入场说明、题量/时长/评分、版本；选择题不得泄露答案；代码/3D/视频采用作品与实测结果多维评分；报告显示通过项、具体失败项、建议重练，并保留同版复核证据。没有足量金标准前不能宣称科学效度和能力排名。
- **资料包**：源文件、可运行代码、练习数据/合法素材、版本锁定、README、许可证说明与交付清单；先测试用户从付款→权益→下载的闭环。
- **SEO/GEO**：只对已发布有价值的内容制作公开课程概览与样例，不批量做空目录页。每课程含原始参考链接、可核对发布日期与实质修订日；不能保证搜索排名第一。

## E. 来源采集数据协议（字段必须落库/可回放）

```json
{
  "signal_id":"X03-20261102",
  "source_type":"x_post",
  "source_url":"https://x.com/chirovisuals/status/2079197556706288008",
  "creator_handle":"@chirovisuals",
  "source_published_at":"2026-07-20",
  "observed_at":"2026-11-02",
  "original_language":"en",
  "fact_check_urls":["https://tympanus.net/codrops/2026/08/11/exploring-procedural-geometry-with-three-js-and-webgpu/","https://github.com/achrefelouafi/GeometryPainterThreeJS"],
  "source_rights":"link_and_independent_summary_only; reuse_of_external_assets_requires_license_review",
  "technical_version":"check_against_current three.js release",
  "course_topic":"Three.js WebGPU+TSL交互特效",
  "status":"RESEARCH_CONFIRMED_NOT_PUBLISHED",
  "job_requirement_evidence":"UNKNOWN",
  "paid_demand_evidence":"UNKNOWN",
  "deliverable_verified":false,
  "exam_verified":false,
  "sku_status":"NOT_LISTED"
}
```

所有来源需保留 source_url、author/organization、发布日期/抓取日期、版本号、权利类型、内容摘要、复现结果、岗位与需求证据、改编稿作者/审核、商品状态。X账号粉丝数、视频播放量、热帖数量**不等于**需求与销量。失效/删除的帖子保留链接和失效状态，不绕过访问或版权控制。

## F. 当期最值得原创化的两条实际课程

**案例1：清华《高级机器学习》X大纲转“LLM工程实践课程”**。只引用已核实的公开技术概念；2026官方完整16周课纲暂未查得，不能拿二次转述当官方教学授权。以 Hugging Face smol-course、Agents Course、官方训练库做可复现教学，测验题全部SOCTHINK原创。不能宣称清华授课、校方合作或颁发清华证书。

**案例2：@chirovisuals 程序化 3D 绘制**。2026-07-20 X原帖→2026-08-11 创作者公开技术讲解→[MIT代码仓库](https://github.com/achrefelouafi/GeometryPainterThreeJS)。只汲取思路，自行设计**不同的场景与交互目标**，例如海洋生态科普沙盘：独立场景、不同材质参数和功能；课程讲向量、Raycaster、局部坐标、采样稳定性、实例化、帧时。即便软件许可允许代码复用，也不得直接转卖第三方文章/教学视频。

## G. 采集与转化验收

1. 每轮不少于3个不同技术类目；尽量先查最近90天原帖，再追原始资源和 changelog。
2. 每个候选至少2种独立证据：X原帖/原创作品 + 官方文档/公开仓库/可运行示例；核验不足则仅入观察池。
3. 一次采购研究只按证据记录，**不得伪造“已抓到、已下载、已上架”**。
4. 做成售卖品至少一个可完整运行项目/可下载内容、逐项目录、独立评分或人工复核、版权记录、消费者体验、实际支付与下载E2E。
5. 中国市场优先：中文表达、网络与安装条件、国内用户价格敏感度、本地岗位需求和可行支付；海外技术作为供给来源。
6. 如发布课程的源技术/许可证发生影响正确性的更新，先重新运行样例并标记新旧版本差异，再更新当前课程。
7. 待售卖产品统一挂现有 `career` / `skill-labs` 与现有资料商城；研发资料留在此仓库 docs，真正状态以已有内容与发布系统回执为准。

## H. 下一轮操作清单

- [ ] 从 X 官方创作者、Three.js/ComfyUI/Hugging Face开发者账号筛出更多原始教程链接并人工抽查10个；
- [ ] 为 X01/X02/X03 各制作一个不依赖转载的完整原生实验、配 24 道原创题 + 评分依据（内容质量验证后才接考试系统）；
- [ ] 核对课程目标与**国内真实岗位JD**；未获得岗位需求证据就按“技能课程”，不冒充招聘笔试；
- [ ] 完成 X03 自制 WebGPU 场景：Chromium WebGPU 与 WebGL2 fallback 比较、低配 Android 实机体验；
- [ ] X04 在授权素材上运行 ComfyUI 工作流，把节点版本、模型许可证、VRAM、运行时间写入教程；
- [ ] 通过 GitHub PR 审核后进入当前平台商品审核与发布流程，不新增平行CMS或收费账本。

编辑日期：2026-11-02。文档研究阶段不可用作生产上线声明。