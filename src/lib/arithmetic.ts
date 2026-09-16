export type ArithmeticGrade = 1|2|3|4|5|6;
export type ArithmeticSkill = "add"|"sub"|"mul"|"div"|"decimal"|"fraction"|"percent"|"mixed";
export type MentalStrategy = "make10"|"bridge10"|"double"|"near_double"|"compensation"|"split"|"distributive"|"friendly_25_50_125"|"fact_recall"|"place_value";

export type GradeProfile = {
  grade: ArithmeticGrade;
  titleZh: string;
  titleEn: string;
  targetAccuracy: number;
  targetMedianMs: number;
  skills: { id:string; labelZh:string; labelEn:string; weight:number; targetMs:number; strategies:MentalStrategy[] }[];
};

export const GRADE_PROFILES:Record<ArithmeticGrade,GradeProfile> = {
  1:{grade:1,titleZh:"一年级口算",titleEn:"Grade 1 Mental Math",targetAccuracy:.95,targetMedianMs:5000,skills:[
    {id:"add20",labelZh:"20以内加法",labelEn:"Addition within 20",weight:4,targetMs:4500,strategies:["make10","double","near_double"]},
    {id:"sub20",labelZh:"20以内减法",labelEn:"Subtraction within 20",weight:4,targetMs:5000,strategies:["bridge10","fact_recall"]},
    {id:"number10",labelZh:"10的组成与分解",labelEn:"Number bonds to 10",weight:2,targetMs:3500,strategies:["make10"]},
  ]},
  2:{grade:2,titleZh:"二年级口算",titleEn:"Grade 2 Mental Math",targetAccuracy:.95,targetMedianMs:4500,skills:[
    {id:"add100",labelZh:"100以内加法",labelEn:"Addition within 100",weight:3,targetMs:5000,strategies:["compensation","split","place_value"]},
    {id:"sub100",labelZh:"100以内减法",labelEn:"Subtraction within 100",weight:3,targetMs:5500,strategies:["compensation","split","place_value"]},
    {id:"times",labelZh:"乘法口诀",labelEn:"Times tables",weight:3,targetMs:3000,strategies:["fact_recall","distributive"]},
    {id:"divide",labelZh:"表内除法",labelEn:"Division facts",weight:1,targetMs:4000,strategies:["fact_recall"]},
  ]},
  3:{grade:3,titleZh:"三年级口算",titleEn:"Grade 3 Mental Math",targetAccuracy:.94,targetMedianMs:5000,skills:[
    {id:"addsub1000",labelZh:"整百整十加减",labelEn:"Add/subtract to 1000",weight:3,targetMs:5000,strategies:["compensation","split","place_value"]},
    {id:"mul1",labelZh:"两位数乘一位数",labelEn:"2-digit × 1-digit",weight:3,targetMs:5500,strategies:["distributive","split"]},
    {id:"div1",labelZh:"整除与有余数除法",labelEn:"Mental division",weight:2,targetMs:6000,strategies:["fact_recall","split"]},
    {id:"friendly",labelZh:"整十整百巧算",labelEn:"Friendly-number shortcuts",weight:2,targetMs:4500,strategies:["compensation","friendly_25_50_125"]},
  ]},
  4:{grade:4,titleZh:"四年级口算",titleEn:"Grade 4 Mental Math",targetAccuracy:.94,targetMedianMs:5500,skills:[
    {id:"mul2",labelZh:"两位数乘整十/整百",labelEn:"Multiplication with round numbers",weight:3,targetMs:5500,strategies:["distributive","place_value"]},
    {id:"div2",labelZh:"整十整百除法",labelEn:"Division with round numbers",weight:2,targetMs:6000,strategies:["place_value","fact_recall"]},
    {id:"laws",labelZh:"运算律巧算",labelEn:"Mental math laws",weight:3,targetMs:6500,strategies:["distributive","compensation","split"]},
    {id:"friendly",labelZh:"25/50/125巧算",labelEn:"25/50/125 shortcuts",weight:2,targetMs:5500,strategies:["friendly_25_50_125"]},
  ]},
  5:{grade:5,titleZh:"五年级口算",titleEn:"Grade 5 Mental Math",targetAccuracy:.94,targetMedianMs:6000,skills:[
    {id:"decimal",labelZh:"小数加减乘除",labelEn:"Decimal arithmetic",weight:4,targetMs:6500,strategies:["place_value","compensation"]},
    {id:"fraction",labelZh:"简单分数运算",labelEn:"Simple fractions",weight:2,targetMs:7000,strategies:["fact_recall","split"]},
    {id:"laws",labelZh:"小数与整数巧算",labelEn:"Efficient mixed calculation",weight:3,targetMs:6500,strategies:["distributive","compensation","friendly_25_50_125"]},
    {id:"estimate",labelZh:"估算与数量级",labelEn:"Estimation",weight:1,targetMs:5000,strategies:["place_value"]},
  ]},
  6:{grade:6,titleZh:"六年级口算",titleEn:"Grade 6 Mental Math",targetAccuracy:.94,targetMedianMs:6500,skills:[
    {id:"fraction",labelZh:"分数四则",labelEn:"Fraction arithmetic",weight:3,targetMs:7500,strategies:["fact_recall","split"]},
    {id:"percent",labelZh:"百分数与小数分数互化",labelEn:"Percent / decimal / fraction",weight:2,targetMs:6000,strategies:["place_value","fact_recall"]},
    {id:"ratio",labelZh:"比例与倍数",labelEn:"Ratio and scaling",weight:2,targetMs:6500,strategies:["split","distributive"]},
    {id:"laws",labelZh:"综合巧算",labelEn:"Advanced mental shortcuts",weight:3,targetMs:7000,strategies:["compensation","distributive","friendly_25_50_125"]},
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
