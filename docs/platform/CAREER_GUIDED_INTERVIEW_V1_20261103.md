# SOC THINK 专业模拟面试：受控智能 + 多模型备份 V1

日期：2026-11-03。设计目标是低延迟、可核查的专业追问，不把开放式聊天伪装成正式招聘评价。

## 对外核心产品

- 面试主问题、岗位规则、验证维度和每一轮可选追问**均为人工/教研预审题本**，两条现有路线分别 5 个主问题 × 4 种预审追问。模型无权添加正式题目或改写招聘考点。
- AI 只选 `brief`（背景不足）、`ownership`（贡献不足）、`outcome`（结果证据不足）、`depth`（有证据后深挖）之一，并输出与候选人原回答完全一致的引文及选择理由。服务器验证引文，决定展示题本中的哪道问题。
- 未授权、无模型、超时、无效格式、引文伪造、超额限流时，继续使用原透明规则追问。前端明确写 `AI判断 · 预审追问` 与 `规则追问`，报告保留来源。
- 模型只负责提出练习问题，不做招聘结果预测、专业认证评价或心理诊断。

## 模型路由与明确备份

环境变量（仅列名称，不写真实密钥）：

```text
SOCTHINK_INTERVIEW_AI_ENABLED=0           # 生产默认关闭
SOCTHINK_INTERVIEW_AI_STYLE=guided        # 默认 guided; 仅研究环境可设 free
SOCTHINK_INTERVIEW_AI_PROVIDER=qwen       # ollama/qwen/mimo/deepseek/openai
SOCTHINK_INTERVIEW_AI_MODEL=qwen3.8-flash
SOCTHINK_INTERVIEW_AI_BACKUP_PROVIDER=mimo
SOCTHINK_INTERVIEW_AI_BACKUP_MODEL=mimo-v2.6-flash
SOCTHINK_INTERVIEW_AI_PRIMARY_TIMEOUT_MS=4500
SOCTHINK_INTERVIEW_AI_BACKUP_TIMEOUT_MS=3500
```

按需配置 `DASHSCOPE_API_KEY`、`MIMO_API_KEY`、`DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`。本地模型 `ollama` 固定 `127.0.0.1:11434`。模型服务地址是服务端固定 allowlist，不允许从请求中传自定义 URL，不能向前端暴露 Key。Provider 只有已配置且显式认可的主/备两家；仅在主模型超时、API 失败或输出证据校验失败后，串行调用备份。**不是并发调用两家**，避免重复付费；主备都失败即规则降级。用户授权文本应展示两家实际可能接收数据的供应商。

默认开放式自由生成追问被替换为 `guided`，可防止模型任意改题。研究用途的 `free` 模式只作对比，不作为默认商用标准。

## 语音路径（下一个独立阶段）

- 流式 ASR → 对音频结束进行确定性主问题/追问轮次判断 → AI 选预审分支 → 直接播放**预生成并缓存**的语音题本。
- 40 个预审追问和 10 个主问题的录音可在离线批量生成。动态用户姓名/具体公司名不插入固定语音。必要时另启 TTS，不能损害最常用路径延迟。
- 同步显示转写，允许用户修正错字；评分只基于用户确认的内容，不根据音色、口音或面部表情推断能力。
- Qwen 实时 Omni / Audio Realtime 是实验路线；是否切换必须看同一批真实流量延迟、转写错字率、有效追问率和供应成本。

## 验收：指标是目标，不是未经测量的现状

1. 本机单轮追问处理延迟：P50 / P95 分别统计 LLM 判断耗时、播放器播报首包耗时、ASR 最终结果耗时，至少 100 次；**初期目标**：文字判定 P95 不超过 3s（受网络与供应商影响），端到端语音 P95 不超过 5s。失败降级需要明确标记、不能无穷等待。
2. 标注集：校招研发、社招采购、后续工业质量等至少 30 份真实或授权的脱敏案例；3 人交叉标注 `brief/ownership/outcome/depth`，统计模型与专家的一致率、严重跑题率、幻觉引用率。引文不一致在服务端必须 100% 拒绝。
3. 主模型故障、备用故障、备用无 Key、503、限流、超时、伪造 JSON、提示注入、无 consent 均单独验收。
4. 商业开放前必须有**服务端订单/权益鉴权、实际支付回执、模型成本计量、个人报告存储和查看**；不能只靠前端隐藏付费按钮或仅靠 IP 限流。当前版本仅为开发/原型，不得宣称收费 AI 面试正式可用。

## 官方参考

- Qwen 文本模型：https://help.aliyun.com/zh/model-studio/text-generation-model
- Qwen 实时音频：https://help.aliyun.com/zh/model-studio/realtime-api-overview
- Xiaomi MiMo 官方模型与价格：https://mimo.mi.com/docs/zh-CN/api 、https://mimo.mi.com/docs/pricing
- DeepSeek Chat Completions：https://api-docs.deepseek.com/api/create-chat-completion/
