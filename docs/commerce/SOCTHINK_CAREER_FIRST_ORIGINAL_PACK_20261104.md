# SOC THINK 第一件原创职业实战资料：AI Agent 工程实验包

2026-11-04｜商业品类：职业实操 / Python / AI Agent｜状态：**已完成内容制作和本地验收、待保密文件入库与真实收款/下载核验，不可向公众售卖**。

## 交付内容（原创、不复刻免费资料）
- 原创离线工单 Agent：白名单工具、独立权限与人工复核、SQLITE 幂等、规则解释、故障回退；无支付退款 API、无模型密钥、无真实用户资料。
- 完整 Python 3.10+ 标准库源码：`service_agent.py`，配套 `test_agent.py`，含 24 项自动化测试；8 条模拟工单；`interview_24.csv` 中的 24 条原创 Agent/后端岗位情境题、参考作答、核验要点和错误反例；中文 PDF 实战手册约 10 页，以及 README。
- 与已有公开 6 节 Agent 导学及线上 24 题正式模拟的关系：公开课程和模拟不下架、不重复卖；付费包提供可独立运行的完整工程、测试样例和岗位表达资料。项目不是企业官方试题或认证，不宣称就业录取。
- 本地当前内容测试回执：`python -m unittest -v test_agent` → **24/24 PASS**；`python service_agent.py examples/tickets.json` → **8/8 JSON 决策**；压缩包 CRC 校验通过；PDF 共 10 页，逐页提取和渲染检查无空白孤页。
- 第一份制作容器里的 ZIP SHA256（只是内容制作回执，**不代表正式文件已上传**）：`8b3fa0204af4507000d10cb5576f7ee89c8f9b6eb4044c6caaf1caa2f5e90407`，大小 **553526 字节**。存储正式文件以**真实上传后**的 SHA256/体积为唯一核验依据，严禁套用旧摘要。
- 当前完整 ZIP 保存在会话产物 `/mnt/data/socthink_agent_lab_pack_v1.zip` 供所有者审阅；这些文件没有复制到网站 `public`，也没有提交到公开仓库。

## 拟售价与真实状态

- 正式目录草案：`ops/db/013_career_agent_first_original_download_draft.sql`。
- 拟价 **¥4.90，一次性下载**，无订阅/自动续费；至少包含上述源码、测试、案例、解析手册。最终是否启用需完整交付验收。
- `product_kind='item',content_kind='resource',content_id='career_agent_lab_pack_v1'`；默认 `enabled=false,rights_approved=false,delivery_verified=false,access_restricted=true`。
- **先将 ZIP 安全暂存于 `SOCTHINK_DIGITAL_FILES_DIR` 的 SHA 内容寻址文件，再登记 `billing_resource_assets` 并独立校验文件摘要/授权**；商品与资产均通过审查后方可开启销售。
- 复用唯一微信 Native 订单、退款核实、买家权益及受保护的 `GET /api/resources/download/[resourceId]`；不创建第二套订单/下载接口。

## 验收后应有的用户路径

岗位路线（AI Agent）→ 明确交付价值与目录样例 → 原有免费课程和练习 → 单份原创实战包正式商品页（显示 ¥4.90，需真实在架）→ 微信登录 → 看清售后条款并主动确认 → Native 微信付款 → 官方核验 paid → 我的账号下载 ZIP → 独立 Python 24 项测试全部通过。

## 还未完成的部分（不可混写成已完成）

1. 将 ZIP 字节安全复制到生产私有资产存储，重新核对 SHA256 和内容，备份文件。
2. 注册到 `billing_resource_assets`，分别完成原创权限、实际可下载测试及商品审批。
3. 生产浏览器完整按上述路径完成一笔真实、经过用户授权的微信支付与下载，回执为 paid + 访问控制 + 原始 ZIP 验收。无购买人不得虚构收款。
4. 上架完成后把商品挂到 `/career/paths/ai-agent-engineer`，而不是在尚未上线时放“付款”假按钮。

## 参考依据与版权界限

原创教育代码与试题自行构造，引用但不复制 OWASP LLM Top 10 2026、NIST AI RMF Generative AI Profile、Python sqlite3 官方文档。商业发布需要真实人员审核内容对外承诺、售后条款以及来源清单。
