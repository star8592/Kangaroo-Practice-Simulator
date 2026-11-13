# SOC THINK：图片 / 视频帧数字化处理链（可执行 v0.1）

**技术定位**：仅处理本地已有、用户自行提供或已获许可使用的图片和视频文件。资料的“截帧”“OCR文字”“校验后的题库资产”属于不同对象：原始媒体永不覆盖，OCR结果永远指向具体原始证据。图文或视频中的第三方内容不会因OCR或重新排版自动获得商业再发行许可。

## 已有设备与工具（2026-10-31 实测）

- Z890：FFmpeg 和 FFprobe 均存在，可将本地视频按时间点截帧。
- 当前批量文字识别默认使用RapidOCR 3.10 / PP-OCRv6 small（CPU、独立Python3.12 ONNX Runtime环境）；Qwen3-VL 8B由Ollama的127.0.0.1:11534提供，是可选疑难复核引擎。
- Python主环境保留Pillow/Numpy，RapidOCR单独安装在项目private目录，避免修改线上依赖；Qwen按需串行调用，不常驻GPU。
- 与SOC THINK现有原始资料归档独立：所有原始文件与衍生截图、文字存放在Z890主机 `Kangaroo-Practice-Simulator/private/derived-knowledge/`，不把原件或截图上传GitHub、网站public目录、微信支付发货目录。
- 源码 `scripts/media_to_knowledge.py`；测试 `scripts/test_media_to_knowledge.py`。与现有PR #201 共用一条资料处理链，不动商品与账本业务代码。

## 数据流

```text
已获许可/自有图片或视频（本地文件）
     │
     ├── SHA256、来源URL、平台、原作者/考试标签
     │
     ├── 原始文件只读保全（original/）
     │
     ├── 图片规范化（evidence/image_*.png）
     │    或 ffmpeg 本地视频取帧（evidence/frame_*_<ms>ms.png）
     │             └── 保守去重：RGB像素完全一致才跳过
     │
     ├── 默认RapidOCR/PP-OCRv6 small逐行识别、记录坐标和置信度
     │   或显式选择Qwen3-VL 8B复核疑难画面
     │        ├── 图片/视频时间点与SHA回链
     │        ├── 无法辨认→[无法辨认]，不自动作答/补写
     │        └── 识别失败→ocr_failed，可单独重试
     │
     ├── manifest.json（原件/帧/时间/文字哈希/复核状态）
     │    每帧独立 image-0001.txt / frame-0001.txt
     │
     └── review-draft.md（需人工复核）
            └── 复核符号、数学图形、题目页序、试卷所属年份、
                答案出处后才能入题库；不自动公开或上架
```

## 实际使用

支持单张图像、图片目录，以及本地MP4等视频。所有输出自动落到私有目录，不需人工另建数据库。

```bash
# 批量处理已经合法保存的图片/照片/手写扫描件
python3 scripts/media_to_knowledge.py image /path/to/user-owned-images \
  --platform user_supplied --rights-status user_owned --ocr \
  --source-label "六年级数学自有资料"

# 本地已获许可的视频：每5秒取帧，最多36帧，
# 去除完全相同的帧，最多识别15张不同画面
python3 scripts/media_to_knowledge.py video /path/to/authorized-lesson.mp4 \
  --platform authorized_video --source-url https://example.org/original \
  --every-seconds 5 --max-frames 36 --max-ocr 15 --ocr

# 只建立原件档案和图片帧，不启动本地视觉模型
python3 scripts/media_to_knowledge.py image /path/to/images

# 测试（无需下载模型）
python3 scripts/test_media_to_knowledge.py
```

- Python主环境保留Pillow/Numpy，RapidOCR单独安装在项目private目录，避免修改线上依赖；Qwen按需串行调用，不常驻GPU。

## 质量约束

1. **原稿和处理稿分开**：保留原始PNG/JPEG/视频的字节和SHA；中间截图记录精确请求时间点（通常等于可抽取视频帧附近的时刻；视频有可变帧率时需另外按媒体时间戳核验精度），OCR是衍生稿，绝不覆盖原始媒体。
2. **保守去重**：仅像素完全一致的画面才会被自动跳过，防止同一页小改动、公式符号/答案选项更新被误判重复。其他近似页面只标待审核。
3. **长视频受控**：默认每5秒取一帧，最多36帧、单视频最长60分钟，单文件最大4GiB；不会自动播放、滚动或登录平台。
4. **OCR非标准答案**：无信心的文字必须与原图对照；数学中的根号、上标、分数、指数、几何图、选择题A/B/C/D需逐题人工或独立模型复核，不能将识别结果作为完全准确的已校试卷。
5. **并行隔离**：只有一个模型顺序处理被选定的关键帧，不把图片下载、视频采集、OCR和商城发布混成一个不可控循环。识别完成前不自动上传或销售。
6. **商业边界最小字段**：每个素材存 `rightsStatus`，默认 `unknown`，且 `commercialRedistributionAllowed=false`；独立授权/合规和质量核验在商品对外交付前完成。

## 尚未实现的部分

- 不支持自动翻页截图付费文库或公众号/视频号受限内容，也不从付费系统绕过下载获得全文。
- 不自动输出已可售课程、完整的正式真题、公式100%识别正确、可发行电子书；这些需要题号比对、错误复核、版式制作和权限确认。
- 面向 S22 / 微信 / 小红书的**单屏手动/授权截图**可导入本地脚本；当前工具本身不驱动平台翻页，不读取微信私人聊天、登录凭据或Cookie。

## 验收口径

先用自己制作的数学测试图验证实际 `qwen3-vl:8b` 能识别中文与符号，再用FFmpeg生成合成短视频检验帧间去重和视频时间点。测试账本与正式媒体库隔离，不拿第三方文库的付费内容作为测试输入。只有收到真正的OCR文本文件与 SHA 回执，才可以说“本地识别成功”。

## 2026-10-31 v0.2 多OCR工程集成

- 已将 RapidOCR 3.10 / PP-OCRv6 small 作为带OCR开关时的默认后端。旧Qwen3-VL仍可通过参数 ocr-backend=ollama 显式调用，两个后端的数据和缓存目录隔离，不相互冒认识别结果。
- RapidOCR适配器通过Z890独立虚拟环境运行，提供逐行文字、坐标与置信度；低可信度标记供校审，原文件与帧SHA256保留。
- 真实故障与修复：独立Python软链接曾被解析为系统解释器，导致缺包。已改为保留venv启动路径，并以专项回归测试约束。
- 新增双OCR差异复核脚本 reconcile_ocr_engines.py。两引擎先确认输入文件SHA和帧SHA相同，再检查数字序列、规范化数学文本、每帧题目块数量；不一致则生成私有复核任务，不擅自裁定谁正确。
- 已在一张自制低清数学图上实际跑出RapidOCR 3题、Qwen3-VL 2题，新脚本自动将此结果标高优先级复核。这是遗漏识别的实证，不是大型真实考试基准。
- 当前所有识别产物仍留在私有实验档案，未更改生产题库、发货目录或网站OCR服务。
