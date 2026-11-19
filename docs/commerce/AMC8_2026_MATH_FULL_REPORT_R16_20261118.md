# 2026 AMC 8 美国原卷 R16：独立数学证明与全链路验收

**日期：2026-11-18；版本状态：独立内部教研/测试、未对公众收费发布。**

## 1. 官方2026美国原卷的数学结果独立校验

新 `scripts/verify_amc8_2026_independent_math.py` 不抄录考试原题正文或图像，针对25道数学问题分别采用算术、分数运算、几何、概率、枚举、分组构造等独立算法，产生每题数值结果、选项字母和算法来源。私有模式 `--verify-private` 对比Z890保存的2026参考答案PDF（SHA-256固定，避免引错版本），实测 **25/25一致**。

数学独立验证不等于中文文字完整复审：依然要确认原卷图形标记、数学符号、中英文翻译、全部解析、真实使用授权。程序/私有题包均标注 `translationFullyReviewed=false`、`rightsVerified=false`、`examReady=false`。

已修正本地Git忽略的中文译稿 Q1、Q9：不再仅说“计算图中算式/根式”，而是完整给出含数字的算式与嵌套根式，提醒用户核对英文原图。重新生成了25题本机JSON、25页中英校对PDF、内部离线可答题HTML。25题数学核对证据按题保存在 `private/drafts/maa-amc8-2026-us-math-independent-ledger.json`，私人原题没有上传GitHub。

2026题库生成脚本 `scripts/prepare_amc8_2026_us_internal.py` 现必须先对25题独立计算选项与参考答案的一致性核验，任意不匹配拒绝构造内部卷。每道题标注 `independentMathAnswerVerified=true`，但仍 `review.needsReview=true`，不会被正式考卷训练门禁放行。

## 2. 真正25题服务器评分到PDF完整链路

新增 `scripts/test_amc8_2026_synthetic_full_report_r16.tsx`：在独立临时用户/考题目录中创建25道**完全自行生成的合成题**（不是MAA题目）。直接调用真实Next `/api/grade`、`appendExamAttempt`、`buildReviewAttempt`、`buildDiagnosticReport`、真实React `DiagnosticReportView`和 `embedLocalReportImages`：

- 25题/40分钟，实际评分25/25；同一合成考生的考试记录保存25题和上下对照语言模式；
- 错题/答案复盘保留25个原题图源，报告实际30页结构（5页分析/结束部分+25页逐题复盘）；
- PDF HTML中的25张合成题图经访问路径核查后全部嵌入；独立真实浏览器打印输出 **30页、约1.3MB** PDF。使用Poppler重渲染第6页，核验中文、图形、答案及页脚均能显示；
- 默认快速测试不用Chrome/PDF打印，在现有 `npm run test:marketplace-bilingual` CI中执行数学程序、网页SSR测试、15项本地图安全测试及25题真实评分报告链路。完整PDF本机测试加 `--render-pdf`，想保留仅合成PDF加 `--save-qa-pdf`（写入 /tmp，不作为商品）。
- 测试使用临时目录，最后释放并恢复工作目录，不使用正式用户、历史订单、真钱或受版权保护的题目。

## 3. 未完成

中文所有25道的**逐字/图文一致性最终人工验收**、按数学定义写出全部解析、MAA商用授权、2026美国版与中国版差异、生产隔离HTTPS部署、闲鱼真实订单及两个规格、30天权益、升级抵扣、真实用户移动端购买/交付仍未验收。测试通过不是上线许可。

下一阶段：把“数学计算已通过”和“翻译/图形/正式发布”拆成四个显式状态，在审阅平台/题库入库中同步；源文件的版权标记保持限制，不能在未审定时触发正式付费API。
