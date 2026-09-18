# CompetitionBank Agent

自动化数学竞赛资料处理流水线。

目标：

发现资料 -> 分类 -> 索引 -> 翻译队列 -> 校验 -> 同步题库。

## MVP

- discover: 自动发现竞赛资料
- index: 建立资产索引
- translation: 生成中文化任务
- validation: 检查双语一致性

## Run

```bash
python3 agent.py scan
```
