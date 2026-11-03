# SOC THINK 本地面试判断模型：证据提取与模型对照（2026-11-03）

> 本文为模型研发验收记录；不是正式招聘测评的效度研究、用户收费服务验收或商业模型云API测评。所有案例均为研发者编写的模拟回答，标签尚未由独立招聘专家复核。

## 设备与模型

- Z890：RTX 5070 Ti 16GB、系统内存约96GB；其他业务同时占用显存。当地 Ollama 只监听 127.0.0.1:11434。
- 快速候选：`qwen3:4b-instruct-2507-q4_K_M`（Ollama，约 2.5GB 文件）；本机实际运行主要在GPU。
- 复杂对照：`hf.co/ggml-org/Qwen3.8-27B-GGUF:Q4_K_M`（Ollama，约19GB，26.9B参数；本次仅能GPU卸载21/65层，余下使用CPU/内存）。
- 已安装 `qwen3-vl:8b` 仅作非正式筛选；当前安装的模型在 `think:false` 时输出进入 thinking 字段且 content 为空，因此不能作为当前结构化API的有效结果。
- 约80GB的第二份模型与启动器未确认实际文件路径和兼容性，**未加载、未作性能声称**。

## 测试方法

同一套 `makeGuidedMessages` 的岗位题目与用户回答，比较三种方案：

1. `baseline`：模型直接在四个预审追问分支中选择一个。
2. `priority`：模型直接选择四分支，另加“背景→个人责任→结果证据→深入取舍”优先级。
3. `extract`：模型从回答逐字抽取 `contextQuote` / `ownershipQuote` / `verificationQuote`，程序校验引用必须来自原文，然后按首个缺失的证据层级确定分支，不允许大模型直接修改正式题目。

所有本地模型请求使用 `/api/chat`、`stream:false`、`think:false`（**顶层**）、`format:"json"`、`num_ctx:2048`、`temperature:0.1`，单线程顺序请求。8B输出异常不算合法判定。

## 原始实测摘要

| 模型 / 算法 | 样本 | 有效JSON | 与预设标签一致 | 单轮 P95 |
|---|---:|---:|---:|---:|
| 4B 直接判断（开发集） | 20 | 20 | 8 / 20 | 772ms |
| 4B 优先级判断（开发集） | 20 | 19 | 10 / 20 | 815ms |
| **4B 证据提取（开发集）** | 20 | 19 | **15 / 20** | 961ms |
| 4B 直接判断（另编12例） | 12 | 11 | 6 / 12 | 2142ms |
| **4B 证据提取（另编12例）** | 12 | 11 | **11 / 12** | 1033ms |
| 27B 非思考直接判断 | 2 | 2 | 1 / 2 | 45731ms |
| 8B-VL 当前模型变体 | 5 | 0 | 0 / 5 | *无有效响应* |

P95 是**这个很小样本集**的顺序请求分位数，包含首次加载与缓存影响，并非生产并发SLA。27B 两次耗时约45.7s与34.9s；不是与4B完全相同样本量。模型更大不等于本机响应更快。优先级判断未达到适合启用的可靠度。

本地真实接口（本轮临时运行）通过了三条测试：团队结果选 ownership、成果/验证充分选 depth、本人做了动作但缺乏验证选 outcome；HTTP200，原文引用逐字匹配。临时服务需要在验收后停止，线上生产 API 仍保持 `enabled:false`。

## 复现

不从公网获取候选人私人面试数据；下面只操作本机合成案例，输出到临时路径：

```bash
npm run test:career-judge-dataset
npm run test:career-guided
npm run bench:career-local -- --model=qwen3:4b-instruct-2507-q4_K_M --rubric=baseline --suite=dev
npm run bench:career-local -- --model=qwen3:4b-instruct-2507-q4_K_M --rubric=extract --suite=dev
npm run bench:career-local -- --model=qwen3:4b-instruct-2507-q4_K_M --rubric=baseline --suite=holdout
npm run bench:career-local -- --model=qwen3:4b-instruct-2507-q4_K_M --rubric=extract --suite=holdout
```

`scripts/fixtures/career-judge-v1.ts` / `career-judge-holdout-v1.ts` 固定标签和案例，脚本输出逐例决策、有效性、耗时和汇总，可用 `--output=/tmp/report.json` 保存原始结构化结果。不要每次修改标签以迎合模型。

## 对产品的作用与硬边界

本版将 `guided` 默认改为**证据提取＋程序选题**；原直接判断可通过 `SOCTHINK_INTERVIEW_AI_STYLE=guided-branch` 在研究环境继续比较，`free` 自由提问仍只供实验。模型错误、引用伪造、输出无效或主/备均不可用时，保留原规则追问。不要把模型自述的理由直接当成绩。

**不能据此正式收费**：32条人工构造样本缺少职业测评专家双盲/交叉标注、真实学员分布、跨岗位覆盖、提示注入红队、并发P95、云API实际质量及成本。生产模型开关默认关；先接服务器付款权益，后方可向真实客户开放。更严谨的上线前验收目标：≥100条脱敏与授权样本，至少2名专业标注者，独立争议仲裁；统计四分类混淆矩阵、无效输出率、错误引文率和P50/P95，按岗位分别报告，而非以一个准确率掩盖严重错误。

参考：[Ollama 官方 thinking 控制](https://github.com/ollama/ollama/blob/main/docs/capabilities/thinking.mdx)；关闭思考须在API请求顶层传 `think:false`，不可误放入 `options`。
