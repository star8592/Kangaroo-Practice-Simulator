/**
 * SOCTHINK original task-based reasoning practice.
 * A non-standardized collection of educational questions: NOT an IQ test.
 * Raw item correctness only, with neither norms nor clinical interpretation.
 */
export type ReasoningDomainId="numeric"|"logical"|"spatial"|"reading";
export type ReasoningDomain={id:ReasoningDomainId;title:string;description:string;nextStep:string};
export type ReasoningItem={
  id:string;domain:ReasoningDomainId;stem:string;options:readonly [string,string,string,string];
  answer:0|1|2|3;reason:string;skill:string;
};
export const REASONING_DOMAINS:readonly ReasoningDomain[]=[
 {id:"numeric",title:"数量与规律",description:"观察数列、比例与实际计算题的准确度。",nextStep:"练习逐步列式、规律假设和反例核对。"},
 {id:"logical",title:"逻辑与条件",description:"辨别必要条件、充分条件和可靠推论。",nextStep:"画条件关系图，区分充分、必要和不能逆推的命题。"},
 {id:"spatial",title:"方位与空间表征",description:"以简单方位、坐标与旋转任务观察完成情况。",nextStep:"在纸面画坐标系，逐步模拟移动和旋转。"},
 {id:"reading",title:"阅读与信息判断",description:"识别陈述边界、逻辑误区和数据解释中的限制。",nextStep:"找出句子中的限定词和缺失证据，避免扩大结论。"}
];
export const REASONING_ITEMS:readonly ReasoningItem[]=[
 {id:"r-n1",domain:"numeric",stem:"数列 3、7、15、31，下一项是多少？",options:["47","55","63","65"],answer:2,reason:"每项等于前一项乘2再加1；31×2+1=63。",skill:"规律识别"},
 {id:"r-n2",domain:"numeric",stem:"一件商品18元，买3件，订单满50元减8元。实付金额是多少？",options:["42元","46元","50元","54元"],answer:1,reason:"原价为18×3=54元，符合满减条件，54−8=46元。",skill:"实际计算"},
 {id:"r-n3",domain:"numeric",stem:"4个连续偶数的和为68，其中最大的数是多少？",options:["18","20","22","24"],answer:1,reason:"四个偶数是14、16、18、20，和为68，最大的是20。",skill:"方程与数感"},
 {id:"r-n4",domain:"numeric",stem:"红球与蓝球数量之比是3:2，共25个球。红球有多少个？",options:["10个","12个","15个","18个"],answer:2,reason:"红球占3/(3+2)，25×3/5=15。",skill:"比例"},
 {id:"r-n5",domain:"numeric",stem:"依次处理A类任务3件（每件12分钟），再处理B类任务3件（每件8分钟）。上午9:00开始，中间不休息，几点完成？",options:["9:48","9:56","10:00","10:12"],answer:2,reason:"总用时3×12+3×8=60分钟，9:00之后60分钟是10:00。",skill:"时间推算"},
 {id:"r-l1",domain:"logical",stem:"已知“所有甲类都属于乙类，所有乙类都属于丙类”，哪项一定成立？",options:["所有甲类都属于丙类","所有丙类都属于甲类","甲类与丙类互不相交","所有乙类都属于甲类"],answer:0,reason:"集合包含关系具有传递性：甲⊆乙⊆丙，故甲⊆丙。反向不能推。",skill:"集合关系"},
 {id:"r-l2",domain:"logical",stem:"规则是“如果需要身份材料，就要核验”。小王被核验了，能否因此断定他需要身份材料？",options:["一定需要","不能，仅凭核验不能逆推","一定不需要","规则本身前后矛盾"],answer:1,reason:"P→Q不能推出Q→P。核验也可能由其他原因触发。",skill:"条件逆推"},
 {id:"r-l3",domain:"logical",stem:"李比王更早到达，王比赵更早到达。如果三人到达时间各不相同，谁最早？",options:["李","王","赵","无法确定"],answer:0,reason:"由李早于王、王早于赵，可得李早于赵，因此李最早。",skill:"顺序推理"},
 {id:"r-l4",domain:"logical",stem:"规定：“只有完成安全测试，才能发布产品。”如果某产品已经发布，哪项必然成立？",options:["它一定没有缺陷","它一定先取得销售额","它已完成安全测试","所有测试都满分"],answer:2,reason:"完成安全测试是发布的必要条件；发布⇒已完成测试，并不保证质量或销量。",skill:"必要条件"},
 {id:"r-l5",domain:"logical",stem:"名单中每个人都通过了资格审核。甲和乙都在名单中。以下哪个结论成立？",options:["名单以外的人都未通过","甲和乙都通过了审核","甲一定比乙更优秀","名单至少有十个人"],answer:1,reason:"已知两人属于名单，且名单成员均通过审核，因此可推出甲乙都通过。其他结论缺少信息。",skill:"全称量词"},
 {id:"r-s1",domain:"spatial",stem:"一个箭头起初朝正北，顺时针旋转90°后朝哪边？",options:["正南","正东","正西","仍为正北"],answer:1,reason:"正北顺时针旋转四分之一圈指向正东。",skill:"方位旋转"},
 {id:"r-s2",domain:"spatial",stem:"平面坐标从(2,1)开始，先向左移动3单位，再向上移动2单位，终点是？",options:["(-1,3)","(5,3)","(-1,-1)","(1,2)"],answer:0,reason:"x坐标2−3=−1，y坐标1+2=3。",skill:"坐标变换"},
 {id:"r-s3",domain:"spatial",stem:"在3×3方格中从正中心出发，先向右1格，再向下1格，停在什么位置？",options:["左下角","右上角","左上角","右下角"],answer:3,reason:"中心为第2行第2列，右移到第2行第3列，下移到第3行第3列，即右下角。",skill:"位置移动"},
 {id:"r-s4",domain:"spatial",stem:"一个正方形的左上角有标记。将整个正方形顺时针旋转90°，标记落在哪一角？",options:["左下角","右下角","右上角","左上角"],answer:2,reason:"方形顺时针转90°，原左上角移动到右上角。",skill:"二维旋转"},
 {id:"r-s5",domain:"spatial",stem:"在4×4方格中，位置用(行,列)表示。标记位于(1,2)。将整个方格旋转180°，其新位置是什么？",options:["(1,3)","(3,4)","(4,2)","(4,3)"],answer:3,reason:"旋转180°后行列均反向，(r,c)→(5−r,5−c)，得(4,3)。",skill:"位置对称"},
 {id:"r-v1",domain:"reading",stem:"一项调查显示，“受访者中有70%喜欢产品A”。哪一结论是这句话本身能够支持的？",options:["所有消费者都喜欢A","受访者中约七成表示喜欢A","A一定比B销量更高","喜欢A的人都已经购买了A"],answer:1,reason:"结果只涵盖受访者的偏好；不能直接外推所有消费者，更不能推断销量和购买行为。",skill:"样本边界"},
 {id:"r-v2",domain:"reading",stem:"研究者发现两项指标同时上升。仅凭这一观察，能够确定它们存在因果关系吗？",options:["不能，相关不等于因果","能，必然互为因果","能，必然是第一个导致第二个","能，必然是第二个导致第一个"],answer:0,reason:"共同变化可能来自混杂因素、共同趋势或偶然，因果需进一步识别。",skill:"相关与因果"},
 {id:"r-v3",domain:"reading",stem:"一家公司的销售额同比增长20%，但利润同比下降。以下哪项不能由已知信息推出？",options:["销售额同比增加","利润同比下降","公司盈利能力必然有所提高","销售额与利润走势不同"],answer:2,reason:"销售额增长不代表利润或利润率改善；数据已明确利润下降。",skill:"指标解释"},
 {id:"r-v4",domain:"reading",stem:"系统规定：只有经过服务端确认已支付的订单才发放数字权益。哪项操作符合该规定？",options:["用户点击支付按钮就发放","服务端核实订单支付成功后发放","用户展示自制支付截图就发放","页面返回成功提示就发放"],answer:1,reason:"只有服务端核验真实支付状态能满足规则，按钮、截图和页面提示不能替代支付确认。",skill:"规则执行"},
 {id:"r-v5",domain:"reading",stem:"一项资格要求“至少完成3次练习”。以下哪一种情况符合要求？",options:["只完成2次","完成3次","只完成1次","没有做练习"],answer:1,reason:"“至少3次”包含3次及以上；给定选项只有恰好3次符合。",skill:"限定词理解"},
];
export type ReasoningDimensionResult={id:ReasoningDomainId;title:string;correct:number;total:number;nextStep:string};
export type ReasoningQuestionResult={id:string;correct:boolean;chosen:number;answer:number;reason:string;skill:string};
export type ReasoningReport={
  version:"reasoning-original-v1"; correct:number; total:number;
  dimensions:ReasoningDimensionResult[]; items:ReasoningQuestionResult[];
};
export function scoreReasoning(answers:Readonly<Record<string,number>>):ReasoningReport|null{
  const allowed=new Set(REASONING_ITEMS.map(x=>x.id));
  for(const [id,answer] of Object.entries(answers)){
    if(!allowed.has(id)||!Number.isInteger(answer)||answer<0||answer>3)throw new Error("INVALID_OBJECTIVE_ANSWER");
  }
  if(REASONING_ITEMS.some(x=>!Object.prototype.hasOwnProperty.call(answers,x.id)))return null;
  const items=REASONING_ITEMS.map(item=>({
    id:item.id,correct:answers[item.id]===item.answer,chosen:answers[item.id],answer:item.answer,reason:item.reason,skill:item.skill,
  }));
  return {version:"reasoning-original-v1",correct:items.filter(x=>x.correct).length,total:items.length,
    dimensions:REASONING_DOMAINS.map(domain=>({
      id:domain.id,title:domain.title,correct:REASONING_ITEMS.filter(x=>x.domain===domain.id&&answers[x.id]===x.answer).length,
      total:REASONING_ITEMS.filter(x=>x.domain===domain.id).length,nextStep:domain.nextStep,
    })),items};
}
export function validateReasoningBank():string[]{
  const errors:string[]=[];
  const ids=new Set<string>();
  if(REASONING_ITEMS.length!==20)errors.push("ITEM_COUNT");
  for(const q of REASONING_ITEMS){
    if(ids.has(q.id))errors.push("DUPLICATE:"+q.id);
    ids.add(q.id);
    if(!REASONING_DOMAINS.some(d=>d.id===q.domain))errors.push("DOMAIN:"+q.id);
    if(q.options.length!==4||new Set(q.options).size!==4||q.options.some(x=>!x.trim()))errors.push("OPTIONS:"+q.id);
    if(q.answer<0||q.answer>3||!q.reason.trim()||!q.skill)errors.push("EVIDENCE:"+q.id);
  }
  for(const d of REASONING_DOMAINS){
    if(REASONING_ITEMS.filter(q=>q.domain===d.id).length!==5)errors.push("CATEGORY_COUNT:"+d.id);
  }
  return errors;
}
