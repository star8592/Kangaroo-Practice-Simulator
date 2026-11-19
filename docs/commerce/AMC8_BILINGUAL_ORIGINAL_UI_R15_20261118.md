# AMC 8 R15：正式考试组件中英上下对照 + 成绩与PDF复盘（2026-11-18）

## 本轮实际改造

2026 US原版试卷继续以R14内部校对资料形式存在。R15不复制、不上传原英文题干及图片，不改变历史卷商业使用权限，也不把未审的本机校对草稿标成正式“训练就绪”。

对任意真实有权利且审核通过的历史原卷，使用 profile.language = zh-en-stacked 且 profile.paperType = past，可以选择中英上下对照呈现；此前所有普通考卷仍走原有中文/英文切换界面，不受影响。

- 新组件 src/components/BilingualOriginalQuestion.tsx：中文译文上方、原版英文题图（含原英文题干、公式、几何图和ABCDE原选项）下方；原图缺失明示，不能以泛化英语提示充作官方原版。前端保留原有ABCDE作答、服务器40分钟计时和分数规则，不引入另一套考试引擎。
- ExamClient：仅上述标记的历史卷启用上下中英布局；原来“切换中/英文字面”的按钮对该模式隐藏，避免将同一个英文原图当中文译文或重复展示题图。
- ReviewClient：读取不可变试卷考试记录中的language/paperType，恢复同一双语界面，再做错题、查看答案和解析；普通考试仍保留独立语言切换。
- attempt-store及review-attempt：新交卷记录持久保存display language，历史老记录缺该字段仍按默认单语模式兼容。
- diagnostic-report及DiagnosticReportView：带上语言模式；上下对照报告每页放一题，避免“3题/页”在打印时挤坏原卷图，普通报告维持3题/页。
- DiagnosticReportDocument：另加PDF专用、独立于全站CSS的BILINGUAL_ORIGINAL_REPORT_CSS；打印页原图尺寸受限但不裁切（object-fit contain），中文与英文源图共同保存。
- training-question-bank：标记zh-en-stacked的past试卷，若任一道题没有英文原卷图的资产URL，则拒绝载入，不能继续以伪英文句子替代原题。此训练检查只是URL存在性；付费合法商用需要继续经过 marketplacePaidExamReady、独立签名审核和真实文件存在性检查。
- package.json/.github/workflows/ci.yml：新增 test:marketplace-bilingual，包含合成试卷的SSR/缺原图/旧考试兼容测试，以及真实隔离交卷后语言标记传至错题和报告的测试；无需在GitHub CI新增Chromium安装工序。

## 隔离验收

- 浏览器4个视口320/390/768/1280、原图加载、上下顺序、无水平溢出与JS错误及安全故障：30/30 PASS，使用完全合成三角形样本，没有复制真正AMC原卷。
- 新的独立诊断打印PDF：使用合成题，真实renderDiagnosticReportPdfFromHtml返回1页可渲染PDF，Poppler重渲染约27KB PNG，图片和中文段落存在；这不是未经授权原卷的公开PDF。
- npm run test:marketplace-bilingual：SSR/权限/训练门禁14/14 PASS，另有已存的test:exam-submit-recovery通过，它实际调用Next grade路由后读取持久化用户记录、buildReviewAttempt和buildDiagnosticReport，验证语言模式未丢失，也检查不同用户不允许复放、重复交卷幂等。
- 原2026离线真实英文源图内部预览复跑20/20 PASS，无旧流程倒退。
- TypeScript和ESLint PASS，npm run verify:public以最终本地执行日志为准，GitHub最新PR SHA远程CI以最后回执为准。

## 仍未完成的必要工作

- R14本地2026中译文仅首稿，原题、翻译、参考答案及数学图形尚需逐题人工或可靠独立复核，必须分开标明美国/阿思丹/中国组委会版本。
- 本轮是正式考试、历史错题及诊断报告的 **UI/数据通道接线**，并非已把2026未审核的真卷开放给一般网站学生。当前2026 US私有JSON仍 examReady=false / needsReview=true / commercialUse=false，服务器正式训练加载器与市场发权均拒绝。
- 真正用户付费/30天¥19.90权益、首次¥1抵扣、闲鱼两规格实单回读、独立HTTPS与上线许可尚未交付，不得声称上线或给买家发货。

开发分支只写入通用组件、受控合成测试、CI脚本和研发文档；实际2026原题图、翻译、PDF、HTML都保留在Z890 Git忽略的private路径。


## R15.1 · 防止诊断PDF丢原卷图（新增）

核查现有诊断PDF独立渲染器：它用临时 file:// 页面生成PDF；普通网站的 /local-assets/xxx.png 绝对路径无法自动从该临时文件找到源图。已在授权用户/家长的PDF响应路径中，先将站内真实、存在的 /local-assets/ 图片转为内嵌 data:image/*，然后交给原Chrome/PDF渲染器。完全无需新建公开下载API；原有权限校验位于调用此步骤之前。

新增 src/lib/diagnostic-report-embed-assets.ts 的防护包括：仅允许local-assets固定根目录中真实PNG/JPEG/WEBP；拒绝dotdot/URL编码穿越/符号链接出根/缺图/错误文件类型/URL参数、单图超过12MiB及总图超过60MiB；相同图片复用编码，避免重复读取；不改变第三方外链，也不把本机路径写进PDF。正式原卷使用权审核仍独立执行，不会因为PDF嵌图就改变试卷是否可售。

scripts/test_report_local_image_embedding_r15.ts **15/15合成图安全验收通过**。CI的 test:marketplace-bilingual 已加入该验证。此前单页PDF实际输出/重渲染合格；正式生产历史卷全套25页真实原卷内容仍未开放，也尚未完成整份30页诊断的真实实单验收。
