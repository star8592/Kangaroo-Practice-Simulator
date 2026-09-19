# 题库数字化流水线

目标：将竞赛 PDF 转换为真正可训练的数据，而不是截图展示。

## 流程

PDF
↓
文件检测
↓
文本提取 / OCR
↓
题目结构解析
↓
JSON 标准化
↓
答案与解析关联
↓
知识点标注
↓
进入考试与训练系统

## 原则

1. 优先处理原生数字 PDF。
2. 只有扫描 PDF 才进入 OCR。
3. OCR 后必须人工/规则校验数学符号。
4. 每道题必须具备：

- questionText
- options
- answer
- solution
- topic
- difficulty
- competition
- year

## 后续实现

- pdf_detector.py
- extract_text.py
- parse_question.py
- validate_bank.py
