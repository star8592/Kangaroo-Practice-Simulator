# AMC 8 2026 美国原卷双语校对 R14（2026-11-18）

## 已完成的本机工作

- 原始依据：Z890研究目录中的2026 MAA AMC 8带封面8页英文PDF，SHA256 = 70daec35c1ab2c0bfd16c97925a475d26dbb6c3cc31899bf3f91beee7d4b588f。2026 LIVE by Po-Shen Loh答案PDF，SHA256 = 15030752bdf9f61f69e8131901ec37f6a9d85b90851debff9179e89091dca593。
- 用原PDF文字坐标定位Q1–25，第2–8页题目分布5、4、3、4、4、4、1。没有OCR、没有AI重绘公式或几何图。英文原文、图和选项用原始页面PNG裁图保留。
- 新增25条中文参考译文（英文题图仍保持原版）；特别需要人工核对Q7分数、Q9根式、Q24超阶乘符号与Q25六边形图形。25项参考答案来自单独答案PDF，尚未独立重做25题数学验算。
- 私有输出：private/drafts/maa-amc8-2026-us-zh-draft.json；private/exams/maa-amc8-2026-us-reference-internal.json；public/local-assets/maa-amc/archive-amc8/2026-us-internal/q01.png至q25.png。
- 双语审阅PDF：private/drafts/maa-amc8-2026-us-bilingual-internal-review.pdf，A4共25页，一题一页，中文译文在上，英文原卷题干、数学公式、几何图及选项在下，重新渲染抽检通过。使用本机Pillow与NotoCJK字体生成。
- 可答题离线HTML：private/drafts/maa-amc8-2026-us-bilingual-offline-preview.html。file://本机打开，40分钟计时、25题导航、ABCDE作答、参考答案评分与重新开始，不依赖后台网络。
- 浏览器实测：独立Playwright Chromium，390px和1280px下共20/20检查通过，包括25/25评分、原始图加载、无脚本错误和无横向滚动。
- 全部原题与翻译文件被现有.gitignore忽略，没有推入公共仓库。已有商用权限函数对该草稿返回false，原正式训练加载器拒绝它，权限元数据为commercialUse=false与needsReview=true。

## 可复现命令（在Z890工作树执行）

1. python3 scripts/prepare_amc8_2026_us_internal.py
2. python3 scripts/prepare_amc8_2026_us_internal.py --write-local-draft
3. python3 scripts/build_amc8_2026_bilingual_review_pdf.py
4. python3 scripts/build_amc8_2026_offline_preview.py
5. node scripts/test_amc8_2026_bilingual_offline.mjs

## 状态及下一阶段

这是完整的本机题图+翻译首稿与离线可答题练习流程，不是已经正式发布的SOC THINK账号考试，也未实现云端成绩或包月发权。下一阶段应逐题校对英文源卷/中文/答案，按明确的2026 US版与中国区各版本分开建档，再以现有考试及报告引擎接入合法商用的版本。内部文件不得被误标为可售内容；闲鱼正式支付/自动发货/HTTPS领取仍未验收。
