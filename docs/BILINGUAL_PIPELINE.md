# Bilingual Question Pipeline

本项目的考试端只面向 **中文 / English** 用户。源试卷可以来自葡萄牙语、德语、法语等语言，但源语言只作为内部校验资料存在，不能成为学生端的回退语言。

## 1. Hard rule

学生端仅允许：

- `zh`：默认语言
- `en`：可切换语言

严禁考试端因为翻译缺失而自动显示 `pt` / `de` / `fr` 等源语言。缺少中英文本的题目必须标记为 `not_exam_ready`，只能在后台审核台出现。

## 2. Question model

每道题分为四层：

```text
Question
├── source
│   ├── language
│   ├── text
│   ├── choices
│   ├── source_pdf
│   └── source_crop
├── localized
│   ├── zh
│   │   ├── stem
│   │   ├── choices
│   │   └── solution
│   └── en
│       ├── stem
│       ├── choices
│       └── solution
├── visual
│   ├── source_crop
│   ├── diagram_only
│   ├── localized_zh
│   └── localized_en
└── review
    ├── translation_status
    ├── visual_status
    └── verified
```

建议字段：

```ts
type LocalizedText = {
  stem: string;
  choices: { key: string; label: string }[];
  solution?: string;
};

type Question = {
  sourceLanguage: string;
  sourceText: string;
  localized: {
    zh?: LocalizedText;
    en?: LocalizedText;
  };
  sourceAssetUrl?: string;
  diagramAssetUrl?: string;
  localizedAssetZh?: string;
  localizedAssetEn?: string;
  translationStatus: "missing" | "machine" | "reviewed";
  visualStatus: "source_only" | "diagram_only" | "localized";
  examReady: boolean;
};
```

## 3. PDF localization pipeline

```text
PDF
 ↓
Question crop
 ↓
Extract text spans + coordinates from PDF text layer
 ↓
Separate semantic text from diagrams / numbers / A-E labels
 ↓
Translate semantic text to zh + en
 ↓
Preserve all mathematical quantities and option keys
 ↓
Generate localized question HTML
 ↓
If source-language text is embedded in the visual:
   redact source text regions
   + overlay translated text
   OR extract a diagram-only asset
 ↓
Automated consistency checks
 ↓
Human review
 ↓
examReady=true
```

## 4. Translation rules

翻译模型必须遵守：

1. 不解题，不补充提示。
2. 不改变数字、单位、几何关系、题号和 A-E 对应关系。
3. 数学符号原样保留。
4. 人名可以自然本地化，但不能改变逻辑关系。
5. 中文表达面向对应年龄儿童，短句优先。
6. 英文保持竞赛题风格，避免文学化改写。
7. 如果原文有歧义，输出 `needs_review=true`，禁止猜测。

## 5. Visual policy

### A. 纯文字题

不显示源语言截图。直接使用 HTML 中文/英文题干与选项。

### B. 图形题，图中无必要文字

使用 `diagram_only`，题干和选项使用 HTML 中英文本。

### C. 图中包含必要文字

例如方向、人物名字、表格标题、图例、文字标签：必须生成 `localized_zh` 和 `localized_en` 两个视觉资产。学生端不能依赖阅读源语言。

### D. A-E / 数字 / 数学符号

A-E、数字、+ - × ÷、角度、单位缩写等通用符号无需翻译。

## 6. Exam gate

一道题只有同时满足以下条件才能进入考试：

```text
answer verified
AND zh stem exists
AND en stem exists
AND choices map is stable
AND visual content is understandable without source language
AND asset exists
```

否则：

```text
examReady = false
```

## 7. UI behavior

- 默认中文。
- 顶部只提供 `中 / EN`。
- 切换语言只切换展示文本和对应 localized asset，不改变答题状态。
- 不提供葡萄牙语/德语/法语学生端按钮。
- 管理员审核台可以查看 `Source / 中文 / English` 三栏对照。

## 8. Translation QA

每道题至少运行以下自动检查：

- 题干中的数字集合：source == zh == en
- 选项 key 集合完全一致
- 数学符号数量异常检测
- 专有单位一致性
- 答案 key 在翻译前后不变
- 图片文件存在且尺寸非零
- 翻译为空或包含大量源语言残留时阻止入库

## 9. Current migration target

第一批迁移对象：葡萄牙 Coimbra `Mini-Escolar I` 2012–2026。

当前已生成 15 年 × 15 题的原题资产后，应追加：

```text
225 source questions
→ 225 zh translations
→ 225 en translations
→ visual classification
→ localized diagram assets where needed
→ bilingual review
→ bilingual exam-ready corpus
```

完成后再将同一流水线复用于 Mini-Escolar II / III、德国、奥地利和法国试卷。
