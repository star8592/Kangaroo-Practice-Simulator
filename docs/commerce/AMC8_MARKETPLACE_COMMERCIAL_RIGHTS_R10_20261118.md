# AMC8 闲鱼收费交付 · 商用版权与人工签名审核 R10（2026-11-18）

**状态：商用权限硬阻断已写入双端代码，但商品 NOT LIVE。**

## 真实资产审计

独立工作树目前训练就绪AMC8只有一套 2024 历史卷，原始项目另存 32 份 AMC8 JSON 文件。其中24份为每套25道有答案与题图的历史/样题。**经逐份读取 rightsPolicy，这24套完整卷全部记录 commercialUse=false、license=null，rightsClass=educational-share**。另8份练习片段题量不足25道，权利也标记商业不可用/需复核。

这些标记表达的是源项目现有使用范围，**“文件是用户持有的”并不等于“有权收费复制题目”**。不得因商品目标是教育服务就把 commercialUse=false 翻成true；也不得私自给官方历史真题补一份虚构许可证。

## 新增真实硬门槛（Node+Rust双端）

1. SOC THINK Next市场领取页、已绑定买家Cookie、考试访问与PDF报告授权，全部使用 marketplacePaidExamReady(examId)。
2. 必须为 AMC8格式、准确25题40分钟、所有题目答案齐全、图像资源可访问，profile.rightsPolicy.commercialUse 必须明确true，rightsClass必须是 original-verified 或 licensed-commercial，附真实 license 标识。
3. **只修改试卷JSON中的 rightsPolicy 不再足够**：在私有 0700 审核目录另存每卷 0600 审核回执。回执包含 examId、源卷原始字节SHA256、对应license、审核人、时间和单独审核密钥生成的HMAC签名。密钥至少32字符，签名必须通过；内容修改、试卷串包、审核撤销/删除、文件被替换/权限放宽、错误密钥均即时失效。
4. Rust 原始 /api/marketplace/claim 在写入grant或设置Cookie**之前**也检查相同审核签名和源试卷哈希；因此绕过前端直接POST不能烧掉未授权试卷的兑换券（返回503）。
5. Rust容器必须能只读访问 SOCTHINK_MARKETPLACE_EXAMS_DIR；Next 从其隔离工作目录的 private/exams 读取完全相同的原始试卷。双方必须使用一致的 SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_DIR 和 SOCTHINK_MARKETPLACE_RIGHTS_REVIEW_SECRET。此密钥不能作为付款凭据，也不能写入仓库、用户日志或网页。
6. 审核签名是*技术防篡改凭据*，并不自动构成著作权许可。人工审核必须在签发记录之前检查真正的原创作者授权/第三方商用许可证，且回执要能溯源。没有审核和权利证据时不签发。

## 测试方式（仅内部）

tests/fixtures/marketplace-amc8-original-qa.json 是用代码生成的25道简单原创算术题，标注 QA Synthetic，不是准备出售的AMC8高品质练习卷。测试程序仅允许 amc8-original-qa-* 的指定测试ID，并验证 sourceLabel、license 为 synthetic-qa-original-only，使用每次随机审核密钥临时生成签名回执。测试结束删除临时试卷与签名信息，不复制任何官方历史题进商用流程。

测试链：
- Node 商业权利+文件篡改/签名/权限故障 15项通过。
- Node 新版单次考券授权 15项、退款Cookie撤销7项、包月防未授权混入20项通过。
- Rust商业授权无凭据直接POST返回503，原HTTP订单/退款故障矩阵32/32通过。
- 真实Next SSR→Rust商用签名审核→25题考试→评分→PDF全流程9/9通过（合成订单、测试卷）。
- License FastAPI→Rust签名审核→退款补偿测试已转为QA合成卷，跨服务13/13通过（合成订单，独立临时进程）。
- 真正网页Chromium手机/桌面回归与整站正式构建，以最后单独回执为准。

## 仍未解除的商业阻断

- 第一套真实高质量、原创或书面授权的AMC8风格收费卷**尚未审核发布**。不能把上述QA算术题视为可销售教材。
- 30天包月承诺至少4套独立原创/获授权卷，而现在没有4套商用批准。
- 原卖家SDK的网页登录Cookie过期；闲鱼真实SKU/规格价格/实单付款状态与买家聊天发货、无实物交付回读未验收。
- 对外隔离HTTPS领取仍未发布；统一月卡实际支付与¥1抵扣事务没有真正上线。
- 所有环境保持草稿；历史真题rightsPolicy不作任何修改，不自动签发真实商业审核回执。

建议下一步从原创题目工厂准备四套含答案、数学解答和知识点标签的AMC8风格练习卷，逐题独立数学验证，再做真实商业批准及问卷E2E，最后开通首单。
