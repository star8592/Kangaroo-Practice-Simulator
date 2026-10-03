import type { ArithmeticGrade } from "@/lib/arithmetic";

export type ArithmeticGradeGuide = {
  headline: string;
  goal: string;
  training: string;
  watch: string;
  headlineEn: string;
  goalEn: string;
  trainingEn: string;
  watchEn: string;
};

export const ARITHMETIC_GRADE_GUIDE: Record<ArithmeticGrade, ArithmeticGradeGuide> = {
  1: {
    headline: "先把数感和20以内加减打牢",
    goal: "熟练掌握10的组成与分解、20以内加减，看到基础算式能快速识别结构，而不是每题都从头数。",
    training: "重点练凑十、破十、双数和近双数。系统会区分“不会算”和“会算但启动慢”。",
    watch: "重点观察手指依赖、反复修改、过十加减卡顿，以及相同结构是否能迁移。",
    headlineEn: "Build number sense and fluency within 20",
    goalEn: "Master number bonds to 10 and addition/subtraction within 20 so basic structures are recognized quickly instead of recounted from scratch.",
    trainingEn: "Practice making ten, bridging ten, doubles and near doubles. The system separates true skill gaps from slow retrieval.",
    watchEn: "Watch for finger counting, repeated edits, difficulty crossing ten, and whether the same structure transfers to new problems.",
  },
  2: {
    headline: "从逐步计算过渡到位值与口诀自动化",
    goal: "稳定完成100以内加减、乘法口诀和表内除法，开始形成按位拆分与补整意识。",
    training: "加减法练位值、拆分和补整；乘除法重点建立口诀直接提取，减少重复推算。",
    watch: "重点观察进退位错误、口诀不熟、除法反推困难，以及能否主动选择更快的方法。",
    headlineEn: "Move from step-by-step counting to place value and fact fluency",
    goalEn: "Handle addition/subtraction within 100, multiplication facts and basic division reliably while developing place-value and compensation strategies.",
    trainingEn: "Use place value, splitting and compensation for addition/subtraction; build direct fact recall for multiplication and division.",
    watchEn: "Watch regrouping errors, weak fact recall, difficulty reversing multiplication for division, and strategy selection.",
  },
  3: {
    headline: "建立乘除法结构感和整十整百巧算",
    goal: "掌握千以内加减、两位数乘一位数、有余数除法，并能识别整十整百的简便结构。",
    training: "把竖式规则和口算结构连接起来，强化分配、拆分、补整和友好数策略。",
    watch: "重点观察乘法分解、余数处理、位值错误，以及是否只会机械竖式。",
    headlineEn: "Build multiplicative structure and efficient round-number calculation",
    goalEn: "Master addition/subtraction to 1000, 2-digit by 1-digit multiplication, division with remainders, and efficient round-number structures.",
    trainingEn: "Connect written algorithms with mental structures using distribution, decomposition, compensation and friendly numbers.",
    watchEn: "Watch multiplicative decomposition, remainder handling, place-value errors and over-reliance on written algorithms.",
  },
  4: {
    headline: "从算得对升级到会选择计算策略",
    goal: "熟练处理整十整百乘除、运算律，以及25、50、125等典型友好数的简便计算。",
    training: "重点训练交换律、结合律、分配律和补整，让学生先看结构再决定怎么算。",
    watch: "重点观察是否能发现25×4、125×8等结构，以及简算过程中是否漏项或补偿错误。",
    headlineEn: "Move from correct calculation to deliberate strategy choice",
    goalEn: "Become fluent with multiplication/division by round numbers, arithmetic laws and efficient use of friendly numbers such as 25, 50 and 125.",
    trainingEn: "Practice commutative, associative and distributive structures plus compensation; inspect the expression before choosing a method.",
    watchEn: "Watch whether patterns such as 25×4 and 125×8 are recognized, and whether terms are lost or compensation is applied incorrectly.",
  },
  5: {
    headline: "进入小数、分数与综合运算阶段",
    goal: "稳定完成小数四则、简单分数运算、估算，并能在整数与小数混合题中选择高效算法。",
    training: "同时训练位值、小数点、分数基本关系、估算和运算律，避免只追求机械速度。",
    watch: "重点观察小数点错位、分数基本事实不熟、数量级判断错误和不必要的复杂计算。",
    headlineEn: "Extend fluency to decimals, fractions and mixed calculation",
    goalEn: "Handle decimal operations, simple fractions and estimation reliably while choosing efficient methods in mixed integer-decimal tasks.",
    trainingEn: "Train place value, decimal alignment, fraction relationships, estimation and arithmetic laws together rather than chasing speed alone.",
    watchEn: "Watch decimal-point placement, weak fraction facts, order-of-magnitude errors and unnecessarily complex methods.",
  },
  6: {
    headline: "把小学计算能力接到初中代数",
    goal: "掌握分数四则、百分数与分数小数互化、比例与倍数，并形成稳定的综合计算能力。",
    training: "强化通分约分、比例缩放、百分数转换和综合巧算，为负数、代数式和方程做准备。",
    watch: "重点观察约分时机、符号与运算顺序、比例关系理解，以及复杂题中的步骤稳定性。",
    headlineEn: "Bridge arithmetic fluency into early algebra",
    goalEn: "Master fraction operations, percent-decimal-fraction conversion, ratios and scaling while building stable multi-step calculation habits.",
    trainingEn: "Strengthen common denominators, simplification, proportional scaling, percent conversion and efficient mixed calculation as preparation for algebra.",
    watchEn: "Watch simplification timing, signs, order of operations, proportional reasoning and stability across longer solutions.",
  },
  7: {
    headline: "完成从算术到代数的关键切换",
    goal: "掌握正负数四则、整式化简与代值、一元一次方程、比例与百分数。",
    training: "重点训练符号规则、运算顺序、去括号合并同类项、代入和方程变形，要求步骤短而稳定。",
    watch: "重点观察负号、括号、移项、代入顺序和等式变形错误，而不是单纯追求做题速度。",
    headlineEn: "Complete the transition from arithmetic to algebra",
    goalEn: "Master signed-number arithmetic, algebraic simplification and substitution, linear equations, ratios and percentages.",
    trainingEn: "Focus on sign rules, order of operations, expanding brackets, collecting like terms, substitution and equation transformations.",
    watchEn: "Watch negative signs, brackets, transposition, substitution order and equivalence-preserving transformations rather than speed alone.",
  },
  8: {
    headline: "提高符号运算和代数变形的稳定性",
    goal: "掌握幂、科学记数、平方根、一次方程比例，以及整式乘法与化简。",
    training: "围绕指数规则、根式基本事实、整式展开与合并、比例方程进行短组专项训练。",
    watch: "重点观察指数规则混淆、根号化简、漏乘项、符号错误和等价变形是否可靠。",
    headlineEn: "Improve reliability in symbolic manipulation",
    goalEn: "Master powers, scientific notation, square roots, linear equations/proportions, polynomial multiplication and simplification.",
    trainingEn: "Use short focused sets on exponent laws, root facts, expansion and collection of terms, and proportional equations.",
    watchEn: "Watch confused exponent laws, radical simplification, omitted products, sign errors and unreliable equivalent transformations.",
  },
  9: {
    headline: "把代数计算连接到函数与概率",
    goal: "稳定完成二次式代值、根式化简、函数代值和基础概率计算，为中考综合题建立计算底盘。",
    training: "强化最简根式、代值顺序、函数输入输出和概率分数化简，训练跨模块切换。",
    watch: "重点观察最简形式、平方与负号、函数自变量代入，以及概率分母分子混淆。",
    headlineEn: "Connect algebraic calculation to functions and probability",
    goalEn: "Reliably evaluate quadratic expressions, simplify radicals, evaluate functions and calculate basic probability.",
    trainingEn: "Practice simplest radical form, substitution order, function input/output and probability-fraction simplification across mixed modules.",
    watchEn: "Watch simplest-form requirements, squares and negative signs, substitution into functions, and numerator/denominator confusion in probability.",
  },
  10: {
    headline: "建立高中数学的基础计算工具箱",
    goal: "掌握函数与分段代值、指数运算、特殊角三角函数和等差数列的基础计算。",
    training: "训练公式识别、代入、指数规则、特殊角准确提取和数列通项，强调方法选择而非盲目提速。",
    watch: "重点观察定义域/分段条件、指数变形、特殊角记忆和数列公式代入错误。",
    headlineEn: "Build the core calculation toolkit for upper-secondary mathematics",
    goalEn: "Master function and piecewise evaluation, exponent operations, special-angle trigonometry and arithmetic sequences.",
    trainingEn: "Practice formula recognition, substitution, exponent laws, special-angle values and sequence terms with emphasis on method selection.",
    watchEn: "Watch domain/piecewise conditions, exponent transformations, special-angle recall and substitution into sequence formulas.",
  },
  11: {
    headline: "把公式使用升级为稳定的综合计算",
    goal: "掌握指数对数、三角函数数值、数列通项与求和，以及概率与组合计数。",
    training: "重点练公式选择、等价变形、数列求和、组合数计算和跨知识点连续运算。",
    watch: "重点观察公式选错、条件遗漏、对数指数互化、组合数约分和长链计算失误。",
    headlineEn: "Turn formula use into reliable multi-topic calculation",
    goalEn: "Master exponential/logarithmic values, trigonometric values, sequence terms and sums, probability and combinatorial counting.",
    trainingEn: "Focus on formula selection, equivalent transformation, sequence sums, combinations and sustained calculation across topics.",
    watchEn: "Watch wrong formula choice, omitted conditions, log/exponential conversion, combination simplification and long-chain arithmetic errors.",
  },
  12: {
    headline: "面向综合考试降低计算性失分",
    goal: "巩固函数、数列、概率排列组合和统计量计算，在综合题中保持正确率与步骤稳定性。",
    training: "采用短时限混合训练和薄弱点回炉，重点训练识别模型、快速调用公式、检查结果合理性。",
    watch: "重点观察综合题切换时的公式误用、重复计算、粗心失分和最后一步算错。",
    headlineEn: "Reduce calculation losses in comprehensive exams",
    goalEn: "Consolidate functions, sequences, probability/combinatorics and statistics while maintaining accuracy and stable steps in mixed problems.",
    trainingEn: "Use short timed mixed sets plus targeted repair; identify the model, retrieve the right formula quickly and check whether results are reasonable.",
    watchEn: "Watch formula misuse when switching topics, duplicated work, avoidable slips and errors in the final calculation step.",
  },
};
