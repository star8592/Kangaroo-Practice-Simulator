export type TechTopic = "ai" | "python" | "data" | "web" | "games" | "rust";
export type TechReference = { title: string; url: string; kind: "官方文档" | "开源项目" };
export type TechBook = {
  slug: string;
  title: string;
  author: string;
  topic: TechTopic;
  level: string;
  introduction: string;
  reason: string;
  practice: string;
  officialUrl: string;
  access: "作者/项目官网免费阅读" | "作者官网图书介绍，购书另行进行";
  lab: { title: string; href: string; note: string };
  references: TechReference[];
};
export const TECH_TOPICS: ReadonlyArray<{ id: TechTopic; label: string }> = [
  { id: "ai", label: "AI 与机器学习" },
  { id: "python", label: "Python 与自动化" },
  { id: "data", label: "数据库与数据工程" },
  { id: "web", label: "Web 开发" },
  { id: "games", label: "3D 与游戏开发" },
  { id: "rust", label: "Rust 与系统工程" },
];
// Independent editorial metadata: no third-party book text, reviews, covers or
// Hacker News ranking data are stored in this catalog.
export const TECH_BOOKS: ReadonlyArray<TechBook> = [
  {
    slug: "dive-into-deep-learning", title: "Dive into Deep Learning",
    author: "Aston Zhang、Zachary C. Lipton、Mu Li、Alexander J. Smola",
    topic: "ai", level: "有 Python 基础",
    introduction: "把机器学习与深度学习的数学解释、代码实验和模型训练放在同一条学习路径中。",
    reason: "适合先弄明白神经网络的训练与评估，再研究 Agent 和大模型系统。",
    practice: "运行一段基础模型训练实验，分别记录训练、验证指标，解释过拟合现象。",
    officialUrl: "https://d2l.ai/", access: "作者/项目官网免费阅读",
    lab: { title: "AI Agent 工程实训", href: "/skill-labs/agent-foundations", note: "接着理解工具调用、权限和独立验收；不是本书附属课程。" },
    references: [{ title: "PyTorch 官方教程", url: "https://pytorch.org/tutorials/", kind: "官方文档" }],
  },
  {
    slug: "automate-the-boring-stuff-with-python", title: "Automate the Boring Stuff with Python",
    author: "Al Sweigart", topic: "python", level: "入门",
    introduction: "围绕文件、表格、文本、网络和日常任务，学习用 Python 完成真实自动化。",
    reason: "适合从具体重复劳动出发，而不是只停留在语法练习。",
    practice: "编写一个批量整理文件并生成执行报告的脚本，加入预览模式和错误处理。",
    officialUrl: "https://automatetheboringstuff.com/3e/", access: "作者/项目官网免费阅读",
    lab: { title: "AI Agent 工程实训", href: "/skill-labs/agent-foundations", note: "学习自动化动作如何经过权限检查与真实执行验证。" },
    references: [{ title: "Python 官方教程", url: "https://docs.python.org/3/tutorial/", kind: "官方文档" }],
  },
  {
    slug: "python-data-science-handbook", title: "Python Data Science Handbook",
    author: "Jake VanderPlas", topic: "python", level: "进阶",
    introduction: "使用 NumPy、Pandas、Matplotlib 和机器学习工具处理、探索与展示数据。",
    reason: "适合将日常数据清洗推进到可复现的分析实验；部分旧示例需对照最新库文档。",
    practice: "用公开样本制作一份有数据处理过程、图表和复现说明的 Notebook。",
    officialUrl: "https://jakevdp.github.io/PythonDataScienceHandbook/", access: "作者/项目官网免费阅读",
    lab: { title: "SQL 数据实训", href: "/skill-labs/sql-lab", note: "用 SQL 先完成结构化数据查询，再进行 Python 分析。" },
    references: [{ title: "原书 Jupyter Notebook 仓库", url: "https://github.com/jakevdp/PythonDataScienceHandbook", kind: "开源项目" }],
  },
  {
    slug: "designing-data-intensive-applications", title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann", topic: "data", level: "进阶",
    introduction: "围绕数据存储、分布式系统、一致性与可靠性，比较不同技术架构的实际取舍。",
    reason: "帮助工程师理解为什么选择某种系统，而不只是记住工具和流行名词。",
    practice: "为一个订单系统绘制数据写入和查询流程，解释一致性、失败恢复及监控边界。",
    officialUrl: "https://dataintensive.net/", access: "作者官网图书介绍，购书另行进行",
    lab: { title: "SQL 数据实训", href: "/skill-labs/sql-lab", note: "先验证查询基础；分布式设计需进一步阅读原书。" },
    references: [{ title: "PostgreSQL 官方文档", url: "https://www.postgresql.org/docs/", kind: "官方文档" }],
  },
  {
    slug: "sql-performance-explained", title: "SQL Performance Explained",
    author: "Markus Winand", topic: "data", level: "具备 SQL 基础",
    introduction: "通过索引结构、查询条件和执行计划，学习分析 SQL 查询为什么快或慢。",
    reason: "数据库优化要基于执行计划和真实数据规模，不靠猜测索引数量。",
    practice: "对同一查询建立索引前后分别执行 EXPLAIN，记录变化并解释结果。",
    officialUrl: "https://use-the-index-luke.com/", access: "作者/项目官网免费阅读",
    lab: { title: "SQL 数据实训", href: "/skill-labs/sql-lab", note: "先练习查询与关联；性能验证需要独立测量。" },
    references: [{ title: "SQLite 查询规划器", url: "https://www.sqlite.org/queryplanner.html", kind: "官方文档" }],
  },
  {
    slug: "eloquent-javascript", title: "Eloquent JavaScript",
    author: "Marijn Haverbeke", topic: "web", level: "入门至进阶",
    introduction: "用 JavaScript 语言、浏览器和 Node.js 的完整实践，构建可运行的编程基础。",
    reason: "适合在理解语法之后继续掌握异步、模块化和浏览器应用。",
    practice: "编写一个带输入校验、状态更新和错误处理的小型交互程序。",
    officialUrl: "https://eloquentjavascript.net/", access: "作者/项目官网免费阅读",
    lab: { title: "JavaScript 在线实训", href: "/skill-labs/code-lab", note: "在站内运行原创任务，并用测试输入核验结果。" },
    references: [{ title: "MDN JavaScript 指南", url: "https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide", kind: "官方文档" }],
  },
  {
    slug: "game-programming-patterns", title: "Game Programming Patterns",
    author: "Robert Nystrom", topic: "games", level: "有编程经验",
    introduction: "借助游戏中的状态、组件和对象池等案例，解释如何管理复杂性和性能。",
    reason: "对需要持续新增玩法的网页游戏尤其有参考价值。",
    practice: "设计一个实体更新循环，比较直接耦合与组件化的维护成本。",
    officialUrl: "https://gameprogrammingpatterns.com/", access: "作者/项目官网免费阅读",
    lab: { title: "Three.js 与 WebGPU 实训", href: "/skill-labs/webgpu-basics", note: "把代码组织思路用于真实浏览器 3D 实验。" },
    references: [{ title: "Three.js 官方手册", url: "https://threejs.org/manual/", kind: "官方文档" }],
  },
  {
    slug: "3d-math-primer", title: "3D Math Primer for Graphics and Game Development",
    author: "Fletcher Dunn、Ian Parberry", topic: "games", level: "需要基本代数基础",
    introduction: "讲清坐标系、向量、矩阵、旋转和插值等 3D 图形与游戏数学。",
    reason: "适合在使用 3D 引擎之前补齐空间变换的基础。",
    practice: "创建一个可旋转物体，验证局部坐标与世界坐标的变换差异。",
    officialUrl: "https://gamemath.com/", access: "作者/项目官网免费阅读",
    lab: { title: "Three.js 与 WebGPU 实训", href: "/skill-labs/webgpu-basics", note: "在浏览器中检验矩阵、交互和 GPU 渲染。" },
    references: [{ title: "Three.js 官方文档", url: "https://threejs.org/docs/", kind: "官方文档" }],
  },
  {
    slug: "the-rust-programming-language", title: "The Rust Programming Language",
    author: "Steve Klabnik、Carol Nichols、Chris Krycho 与社区贡献者",
    topic: "rust", level: "有基础编程经验",
    introduction: "系统学习所有权、借用、生命周期、类型和并发等 Rust 语言核心能力。",
    reason: "适合构建更可靠的系统工具和网络程序；应结合当前稳定版文档学习。",
    practice: "创建一个读取与解析配置文件的 CLI，给错误路径编写自动测试。",
    officialUrl: "https://doc.rust-lang.org/book/", access: "作者/项目官网免费阅读",
    lab: { title: "浏览现有技能实训", href: "/skill-labs", note: "Rust 专项实验尚未开放，不把其他语言实训冒充 Rust 课程。" },
    references: [{ title: "Cargo 官方文档", url: "https://doc.rust-lang.org/cargo/", kind: "官方文档" }],
  },
];
export function getTechBook(slug: string): TechBook | undefined {
  return TECH_BOOKS.find(book => book.slug === slug);
}
export function filterTechBooks(query: string, topic: string): TechBook[] {
  const normalized = query.trim().toLocaleLowerCase();
  return TECH_BOOKS.filter(book =>
    (!topic || book.topic === topic) &&
    (!normalized || [book.title, book.author, book.introduction, book.reason,
      TECH_TOPICS.find(topic => topic.id === book.topic)?.label ?? ""].some(
      value => value.toLocaleLowerCase().includes(normalized)
    ))
  );
}
