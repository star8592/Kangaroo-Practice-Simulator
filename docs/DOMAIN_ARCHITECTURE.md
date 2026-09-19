# Math Competition Lab Domain Architecture

## 顶层领域

系统分为四个一级数学学习领域，而不是把所有训练都归入竞赛：

```
Math Competition Lab

├── Competition Training
│   ├── Math Kangaroo
│   ├── Australian AMC
│   └── MAA AMC
│
├── Arithmetic Training
│   ├── 计算速度
│   ├── 准确率
│   ├── 巧算策略
│   ├── 自适应训练
│   └── 错误模式分析
│
├── AI Solution Engine
│   ├── 解题分析
│   ├── 可视化讲解
│   └── 动画生成
│
└── Student Learning Profile
    ├── 长期能力曲线
    ├── 知识点画像
    └── 个性化训练建议
```

## 设计原则

竞赛训练和口算训练共享学生画像，但使用不同评价模型。

竞赛关注：

- 赛制
- 时间
- 分值
- 难度
- 真题表现

口算关注：

- 自动化程度
- 反应速度
- 计算准确性
- 策略选择
- 稳定性

两者数据最终汇聚到学生能力模型，但不互相替代。

## 后续开发边界

- competition-agent 负责竞赛资料生产、PDF解析、题库导入。
- arithmetic 负责基础计算训练和诊断。
- solution-engine 负责 AI 解题与教学内容生成。
- web 应用负责用户交互和学习流程。
