# Kangaroo Practice Simulator

本地优先的袋鼠数学仿真考试系统。第一版实现 Level A（Grades 1–2）24 题 / 75 分钟 / 3·4·5 分梯度、自动计分、成绩诊断、逐题复盘与题库审核台。

## 本地启动

```bash
npm install
python3 scripts/import_level_a.py \
  --corpus-root /mnt/disk1/master_data/Education/Math_Kangaroo_Library
npm run dev
```

访问 `http://localhost:3000`。生产模式也可用 `npm run build && npm start`。

## 回归测试

服务启动后执行：

```bash
python3 scripts/smoke_test.py --base http://127.0.0.1:3000
```

验证 24 题分布为 8×3 / 8×4 / 8×5，全部答对得 120 分，全部空白得 24 分。

## 数据原则

`private/question-bank.json` 从本地 `Math_Kangaroo_Library` 生成并被 Git 忽略。GitHub 仓库保存考试引擎、导入脚本和架构文档，不保存本地完整题库。

## 当前 MVP

- Level A 24 题，8 × 3 分、8 × 4 分、8 × 5 分
- 75 分钟倒计时与自动交卷
- 题号导航、标记检查、中英切换
- 服务端评分：起始 24 分，答对加题目分值，答错 -1，空题 0
- 按难度 / 知识点成绩分析
- 逐题复盘与解析
- 本地管理员题库审核台

## 下一阶段

1. PDF 自动切题 + 原题图保真显示
2. A–F 全等级导入
3. SQLite/PostgreSQL 持久化考试记录
4. 题目审核工作流与错因标签
5. 基于历史表现的自适应组卷
