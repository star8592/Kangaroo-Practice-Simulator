export type ArithmeticGrade = 1|2|3|4|5|6|7|8|9|10|11|12;
export type ArithmeticSkill = "add"|"sub"|"mul"|"div"|"decimal"|"fraction"|"percent"|"mixed"|"algebra"|"power"|"root"|"function"|"trigonometry"|"sequence"|"probability"|"statistics";
export type MentalStrategy = "make10"|"bridge10"|"double"|"near_double"|"compensation"|"split"|"distributive"|"friendly_25_50_125"|"fact_recall"|"place_value";
export type CleverNode = "make10"|"bridge10"|"double"|"near_double"|"add_compensation"|"sub_compensation"|"mul_compensation"|"split_place"|"distributive"|"friendly25"|"friendly50"|"friendly125"|"fact_recall"|"place_value";

export type GradeProfile = {
  grade: ArithmeticGrade;
  titleZh: string;
  titleEn: string;
  targetAccuracy: number;
  targetMedianMs: number;
  skills: { id:string; labelZh:string; labelEn:string; weight:number; targetMs:number; strategies:MentalStrategy[] }[];
};

export const GRADE_PROFILES:Record<ArithmeticGrade,GradeProfile> = {
  1:{grade:1,titleZh:"一年级计算",titleEn:"Grade 1 Calculation",targetAccuracy:.95,targetMedianMs:5000,skills:[
    {id:"add20",labelZh:"20以内加法",labelEn:"Addition within 20",weight:4,targetMs:4500,strategies:["make10","double","near_double"]},
    {id:"sub20",labelZh:"20以内减法",labelEn:"Subtraction within 20",weight:4,targetMs:5000,strategies:["bridge10","fact_recall"]},
    {id:"number10",labelZh:"10的组成与分解",labelEn:"Number bonds to 10",weight:2,targetMs:3500,strategies:["make10"]},
  ]},
  2:{grade:2,titleZh:"二年级计算",titleEn:"Grade 2 Calculation",targetAccuracy:.95,targetMedianMs:4500,skills:[
    {id:"add100",labelZh:"100以内加法",labelEn:"Addition within 100",weight:3,targetMs:5000,strategies:["compensation","split","place_value"]},
    {id:"sub100",labelZh:"100以内减法",labelEn:"Subtraction within 100",weight:3,targetMs:5500,strategies:["compensation","split","place_value"]},
    {id:"times",labelZh:"乘法口诀",labelEn:"Times tables",weight:3,targetMs:3000,strategies:["fact_recall","distributive"]},
    {id:"divide",labelZh:"表内除法",labelEn:"Division facts",weight:1,targetMs:4000,strategies:["fact_recall"]},
  ]},
  3:{grade:3,titleZh:"三年级计算",titleEn:"Grade 3 Calculation",targetAccuracy:.94,targetMedianMs:5000,skills:[
    {id:"addsub1000",labelZh:"整百整十加减",labelEn:"Add/subtract to 1000",weight:3,targetMs:5000,strategies:["compensation","split","place_value"]},
    {id:"mul1",labelZh:"两位数乘一位数",labelEn:"2-digit × 1-digit",weight:3,targetMs:5500,strategies:["distributive","split"]},
    {id:"div1",labelZh:"整除与有余数除法",labelEn:"Mental division",weight:2,targetMs:6000,strategies:["fact_recall","split"]},
    {id:"friendly",labelZh:"整十整百巧算",labelEn:"Friendly-number shortcuts",weight:2,targetMs:4500,strategies:["compensation","friendly_25_50_125"]},
  ]},
  4:{grade:4,titleZh:"四年级计算",titleEn:"Grade 4 Calculation",targetAccuracy:.94,targetMedianMs:5500,skills:[
    {id:"mul2",labelZh:"两位数乘整十/整百",labelEn:"Multiplication with round numbers",weight:3,targetMs:5500,strategies:["distributive","place_value"]},
    {id:"div2",labelZh:"整十整百除法",labelEn:"Division with round numbers",weight:2,targetMs:6000,strategies:["place_value","fact_recall"]},
    {id:"laws",labelZh:"运算律巧算",labelEn:"Mental math laws",weight:3,targetMs:6500,strategies:["distributive","compensation","split"]},
    {id:"friendly",labelZh:"25/50/125巧算",labelEn:"25/50/125 shortcuts",weight:2,targetMs:5500,strategies:["friendly_25_50_125"]},
  ]},
  5:{grade:5,titleZh:"五年级计算",titleEn:"Grade 5 Calculation",targetAccuracy:.94,targetMedianMs:6000,skills:[
    {id:"decimal",labelZh:"小数加减乘除",labelEn:"Decimal arithmetic",weight:4,targetMs:6500,strategies:["place_value","compensation"]},
    {id:"fraction",labelZh:"简单分数运算",labelEn:"Simple fractions",weight:2,targetMs:7000,strategies:["fact_recall","split"]},
    {id:"laws",labelZh:"小数与整数巧算",labelEn:"Efficient mixed calculation",weight:3,targetMs:6500,strategies:["distributive","compensation","friendly_25_50_125"]},
    {id:"estimate",labelZh:"估算与数量级",labelEn:"Estimation",weight:1,targetMs:5000,strategies:["place_value"]},
  ]},
  6:{grade:6,titleZh:"六年级计算",titleEn:"Grade 6 Calculation",targetAccuracy:.94,targetMedianMs:6500,skills:[
    {id:"fraction",labelZh:"分数四则",labelEn:"Fraction arithmetic",weight:3,targetMs:7500,strategies:["fact_recall","split"]},
    {id:"percent",labelZh:"百分数与小数分数互化",labelEn:"Percent / decimal / fraction",weight:2,targetMs:6000,strategies:["place_value","fact_recall"]},
    {id:"ratio",labelZh:"比例与倍数",labelEn:"Ratio and scaling",weight:2,targetMs:6500,strategies:["split","distributive"]},
    {id:"laws",labelZh:"综合巧算",labelEn:"Advanced mental shortcuts",weight:3,targetMs:7000,strategies:["compensation","distributive","friendly_25_50_125"]},
  ]},

  7:{grade:7,titleZh:"七年级计算",titleEn:"Grade 7 Calculation",targetAccuracy:.93,targetMedianMs:8500,skills:[
    {id:"signed",labelZh:"正负数四则",labelEn:"Signed-number arithmetic",weight:3,targetMs:7000,strategies:["fact_recall","place_value"]},
    {id:"algebra_value",labelZh:"整式代值",labelEn:"Algebraic substitution",weight:3,targetMs:8500,strategies:["split","distributive"]},
    {id:"linear_eq",labelZh:"一元一次方程",labelEn:"Linear equations",weight:3,targetMs:10000,strategies:["split","compensation"]},
    {id:"ratio_percent",labelZh:"比例与百分数",labelEn:"Ratio and percent",weight:1,targetMs:8000,strategies:["place_value","fact_recall"]},
  ]},
  8:{grade:8,titleZh:"八年级计算",titleEn:"Grade 8 Calculation",targetAccuracy:.92,targetMedianMs:9500,skills:[
    {id:"power",labelZh:"幂与科学记数",labelEn:"Powers and scientific notation",weight:2,targetMs:8500,strategies:["fact_recall","place_value"]},
    {id:"root",labelZh:"平方根与算术平方根",labelEn:"Square roots",weight:2,targetMs:8000,strategies:["fact_recall"]},
    {id:"linear_eq",labelZh:"一次方程与比例",labelEn:"Linear equations and proportions",weight:3,targetMs:10000,strategies:["split","compensation"]},
    {id:"algebra_value",labelZh:"整式乘法与代值",labelEn:"Polynomial evaluation",weight:3,targetMs:10000,strategies:["distributive","split"]},
  ]},
  9:{grade:9,titleZh:"九年级计算",titleEn:"Grade 9 Calculation",targetAccuracy:.92,targetMedianMs:10500,skills:[
    {id:"quadratic_value",labelZh:"二次式代值",labelEn:"Quadratic evaluation",weight:3,targetMs:10000,strategies:["distributive","split"]},
    {id:"root",labelZh:"根式数值计算",labelEn:"Radical evaluation",weight:2,targetMs:9000,strategies:["fact_recall"]},
    {id:"function",labelZh:"函数代值",labelEn:"Function evaluation",weight:3,targetMs:10000,strategies:["split","distributive"]},
    {id:"probability",labelZh:"基础概率",labelEn:"Basic probability",weight:2,targetMs:9000,strategies:["fact_recall","place_value"]},
  ]},
  10:{grade:10,titleZh:"高一计算",titleEn:"Grade 10 Calculation",targetAccuracy:.91,targetMedianMs:11500,skills:[
    {id:"function",labelZh:"函数与分段代值",labelEn:"Function evaluation",weight:3,targetMs:10500,strategies:["split","distributive"]},
    {id:"power",labelZh:"指数运算",labelEn:"Exponents",weight:2,targetMs:9500,strategies:["fact_recall","place_value"]},
    {id:"trig",labelZh:"特殊角三角函数",labelEn:"Special-angle trigonometry",weight:2,targetMs:8500,strategies:["fact_recall"]},
    {id:"sequence",labelZh:"等差数列",labelEn:"Arithmetic sequences",weight:3,targetMs:11000,strategies:["split","distributive"]},
  ]},
  11:{grade:11,titleZh:"高二计算",titleEn:"Grade 11 Calculation",targetAccuracy:.90,targetMedianMs:12500,skills:[
    {id:"log",labelZh:"指数与对数数值",labelEn:"Exponential and logarithmic values",weight:2,targetMs:10000,strategies:["fact_recall"]},
    {id:"trig",labelZh:"三角函数数值",labelEn:"Trigonometric values",weight:2,targetMs:9500,strategies:["fact_recall"]},
    {id:"sequence",labelZh:"数列通项与求和",labelEn:"Sequences and sums",weight:3,targetMs:12000,strategies:["split","distributive"]},
    {id:"probability",labelZh:"概率与组合计数",labelEn:"Probability and counting",weight:3,targetMs:12500,strategies:["fact_recall","split"]},
  ]},
  12:{grade:12,titleZh:"高三计算",titleEn:"Grade 12 Calculation",targetAccuracy:.90,targetMedianMs:13000,skills:[
    {id:"function",labelZh:"函数综合代值",labelEn:"Advanced function evaluation",weight:2,targetMs:11500,strategies:["split","distributive"]},
    {id:"sequence",labelZh:"数列与求和",labelEn:"Sequences and summation",weight:2,targetMs:12000,strategies:["split","distributive"]},
    {id:"probability",labelZh:"概率与排列组合",labelEn:"Probability and combinatorics",weight:3,targetMs:13000,strategies:["fact_recall","split"]},
    {id:"statistics",labelZh:"统计量计算",labelEn:"Statistics",weight:3,targetMs:11500,strategies:["place_value","split"]},
  ]},
};

export const STRATEGY_GUIDE:Record<MentalStrategy,{zh:string;en:string}> = {
  make10:{zh:"先凑成10，再加剩下的数",en:"Make 10 first, then add the rest"},
  bridge10:{zh:"先减到10，再减剩下的数",en:"Subtract to 10 first, then subtract the rest"},
  double:{zh:"优先识别双数：a+a=2a",en:"Recognize doubles first"},
  near_double:{zh:"靠近双数时先算双数，再±1",en:"Use a nearby double, then adjust by 1"},
  compensation:{zh:"把接近整十/整百的数补整，再补偿回来",en:"Round to a friendly number, then compensate"},
  split:{zh:"按位或按倍数拆分，分段计算",en:"Split into place-value or factor chunks"},
  distributive:{zh:"用分配律拆成更容易的乘法",en:"Use the distributive property"},
  friendly_25_50_125:{zh:"看到25/50/125，优先寻找4/2/8等配对凑整",en:"Pair 25/50/125 with 4/2/8 to make round numbers"},
  fact_recall:{zh:"这类题目标是直接提取基础事实，不重新推导",en:"Recall the basic fact directly"},
  place_value:{zh:"先看位值和0的变化，再计算有效数字",en:"Track place value and zeros first"},
};


export const CLEVER_NODE_GUIDE:Record<CleverNode,{zh:string;en:string;minGrade:ArithmeticGrade}> = {
  make10:{zh:"凑十",en:"Make 10",minGrade:1},
  bridge10:{zh:"破十 / 过十",en:"Bridge through 10",minGrade:1},
  double:{zh:"双数",en:"Doubles",minGrade:1},
  near_double:{zh:"近双数",en:"Near doubles",minGrade:1},
  add_compensation:{zh:"加法补整",en:"Addition compensation",minGrade:2},
  sub_compensation:{zh:"减法补整",en:"Subtraction compensation",minGrade:2},
  mul_compensation:{zh:"乘法补整",en:"Multiplication compensation",minGrade:4},
  split_place:{zh:"按位拆分",en:"Place-value splitting",minGrade:2},
  distributive:{zh:"分配律",en:"Distributive property",minGrade:3},
  friendly25:{zh:"25配4",en:"25 × 4 pairing",minGrade:3},
  friendly50:{zh:"50配2",en:"50 × 2 pairing",minGrade:3},
  friendly125:{zh:"125配8",en:"125 × 8 pairing",minGrade:3},
  fact_recall:{zh:"基础事实直接提取",en:"Direct fact recall",minGrade:1},
  place_value:{zh:"位值与整十整百",en:"Place value / round numbers",minGrade:2},
};
