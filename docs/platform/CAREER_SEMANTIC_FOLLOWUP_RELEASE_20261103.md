# SOC THINK 岗位模拟面试：真正语义追问的发布与验收规范（2026-11-03）

关联 #254 / PR #272。此版本补充模型调用能力，不代表生产环境已有模型服务。

## 已实现代码边界

- `/api/career/interviews/followup`：GET 仅报告模型是否配置；POST 在显式用户授权时从**当前轮**发送问题、真实回答和用户主动提供的 JD / 经历摘要。
- 后端只允许开发者配置的固定 OpenAI 官方 HTTPS 接口或本机 `127.0.0.1:11434` Ollama；没有任意用户提供的 provider URL，避免 SSRF 和凭据外泄。模型密钥仅在服务端环境中，不得写入前端或Git仓库。
- 模型需返回一条针对事实缺口的追问、候选人回答的**逐字引用**和追问理由。输出结构、长度、逐字引用及标签都经过服务端验证；未通过视为模型无效，前端以规则追问安全降级。
- 需要**两个独立勾选**：原练习说明和“自愿发往模型进行AI语义追问”。默认不发送，断线/未授权只使用旧规则。
- 模型失效、限流、超时、未配置时，不伪称使用AI；不丢失本次回答。每轮记录 `followupMode` 并在答题和报告显示生成来源。所有数据仍按原本标签页 sessionStorage 暂存，**模型服务自身的数据保留由所选模型服务政策决定**，不能承诺第三方零保留。
- 本功能只输出练习追问，不给招聘录取建议/通过率/心理测量成绩。不得复制其他考试供应商受限题本。

## 生产启用条件

环境变量（仅写入服务器服务管理器或经过审计的秘密管理系统；此处只列名称）：

- `SOCTHINK_INTERVIEW_AI_ENABLED=1`。
- `SOCTHINK_INTERVIEW_AI_PROVIDER=openai` 时，必须提供非空 `OPENAI_API_KEY`，`SOCTHINK_INTERVIEW_AI_MODEL` 指向经核验可用且支持 Chat Completions JSON schema structured output 的模型。
- `SOCTHINK_INTERVIEW_AI_PROVIDER=ollama` 时，本机 `127.0.0.1:11434` 必须运行经实测的指定模型（默认配置名只是示例）。应禁止在公网上暴露 Ollama 端口。

当前部署默认是关闭（`GET.enabled=false`），不得手工把布尔开关置真后就宣布AI可用。开启前必须完成：

1. 服务端模型授权、网络、成本预算、数据保留条款核对；访问模型的权限不得从公众页面暴露；
2. 同一个人同一次应聘的真实回答至少三组：有数字、无数字、矛盾信息；验证生成的追问**针对前一轮具体事实**，不重复固定题目；两条岗位分别运行；
3. 低延迟、超时、错误JSON、幻觉引文、提示注入、敏感信息及模型失效等测试；逐字引用不匹配必须拒绝；
4. 正式公网桌面/手机真实作答、刷新恢复与规则降级；一轮次明确区分语义/规则，不把模拟响应算真实模型验证；
5. 正式用户授权小范围开放，再统计实际有用率、错误引用率、失败率与单位成本；若不稳定关闭 `SOCTHINK_INTERVIEW_AI_ENABLED`，不会影响免费原路线。

无用户授权不得传送简历正文或回答到模型服务。当前实现用于原型逐步追平，正式商业级还有语音、权威评分、深度报告、付费权益与真实微信订单交付未完成。

参考官方文档：
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- https://developers.openai.com/api/docs/guides/structured-outputs
