/**
 * SOCTHINK original reading practice, 4 passages x 4 items.
 * This is NOT a standardized literacy assessment or learning diagnosis.
 * All text, answer keys and evidence spans are first-party original content.
 */
export type ReadingSkillId="locate"|"infer"|"quantify"|"evaluate";
export type ReadingSkill={
  readonly id:ReadingSkillId;
  readonly name:string;
  readonly interpretation:string;
  readonly practice:string;
};
export type ReadingPassage={readonly id:string;readonly title:string;readonly text:string;readonly source:"SOCTHINK 原创模拟材料"};
export type ReadingQuestion={
  readonly id:string;readonly passageId:string;readonly skill:ReadingSkillId;readonly stem:string;
  readonly options:readonly [string,string,string,string];readonly answer:0|1|2|3;
  readonly evidence:string;readonly explanation:string;
};
export const READING_SKILLS:readonly ReadingSkill[]=[
  {id:"locate",name:"定位明确信息",interpretation:"是否准确查到文章明确说明的时间、条件或事实。",practice:"用铅笔圈出题干限定词，再到原文定位同义表达，不依赖印象作答。"},
  {id:"infer",name:"有依据地推断",interpretation:"能否区分原文给出的线索与未经支持的猜想。",practice:"每次推断先写一句“因为原文说……，所以可以推断……”，避免过度联想。"},
  {id:"quantify",name:"数据与数量理解",interpretation:"能否在原文给出的数字和单位间正确计算。",practice:"先写清分子、分母、单位与比较对象，再验算一次。"},
  {id:"evaluate",name:"证据和结论边界",interpretation:"能否识别样本范围、可能的混杂因素与结论限制。",practice:"问自己：样本是谁？还可能有什么解释？能否直接推出因果？"}
];
export const READING_PASSAGES:readonly ReadingPassage[]=[
 {id:"p-plants",title:"资料一 · 窗边的两盆豆苗",source:"SOCTHINK 原创模拟材料",
  text:"科学社团观察两盆同时播种的豆苗。A盆放在教室窗边，B盆放在柜子旁；两盆使用相同种子和土壤，每天各浇水100毫升。第7天，A盆平均高度6厘米，B盆平均高度5厘米；第14天，A盆平均高度9厘米，B盆平均高度7厘米。社团成员认为光照可能影响生长，但这项观察每组只有一盆，且没有记录温度、实际日照时长等因素。指导老师要求在下次实验中增加样本，并使用仪器记录环境。"},
 {id:"p-library",title:"资料二 · 社区图书馆的预约规则",source:"SOCTHINK 原创模拟材料",
  text:"社区图书馆周二至周五16:30—18:00开放，周六9:00—11:00开放，周日和周一不开放。读者每次最多借阅3本纸质书，借期为14个自然日。预约成功后，系统从第一个开放日开始计数，读者需在连续3个开放日内领取；未领取则取消预约。假如一位读者在周五晚19:00预约成功，接下来的周六是第一个开放日，下周二是第二个开放日，下周三是第三个开放日。临时闭馆时，馆方会在公告中另行说明规则。"},
 {id:"p-transit",title:"资料三 · 交通工具体验调查",source:"SOCTHINK 原创模拟材料",
  text:"一组志愿者比较了两种查询公交到站时间的方法。使用手机应用的40名受访者中，有30人表示“满意”；使用纸质时刻表的40名受访者中，有28人表示“满意”。两组人数相同，但志愿者是自行选择查询方式的，研究人员没有随机分配。调查只包含这80名志愿者，也没有核实各人所处线路的班次稳定性。因此，研究人员只能报告此次受访者的满意情况，不能证明查询方式本身必然导致满意度差异。"},
 {id:"p-reading",title:"资料四 · 阅读小组的两种复习方法",source:"SOCTHINK 原创模拟材料",
  text:"阅读小组试用两种复习方法：甲组在阅读后画出关键句，并在第二天尝试不看原文复述；乙组只在阅读当天反复默读。每组12人。七天后对同一篇文章进行回忆测验，甲组平均答对8题，乙组平均答对6题，测验满分10题。两组学生在开始前并没有进行同等水平的检测，学习时间也未逐一记录。老师提醒，结果可以帮助提出下一轮研究问题，但不应据此断言甲方法对所有学生都更有效。"}
];
export const READING_QUESTIONS:readonly ReadingQuestion[]=[
 {id:"lr-01",passageId:"p-plants",skill:"locate",stem:"两盆豆苗每天各浇水多少毫升？",options:["50毫升","100毫升","150毫升","200毫升"],answer:1,evidence:"每天各浇水100毫升",explanation:"题目问的是每盆每日浇水量，原文明确写100毫升。"},
 {id:"lr-02",passageId:"p-plants",skill:"infer",stem:"根据观察记录，以下哪种说法最合理？",options:["两盆苗的生长完全一致","A盆第7到14天的高度增长多于B盆","光照被证明是唯一原因","B盆一定缺少水分"],answer:1,evidence:"第7天，A盆平均高度6厘米，B盆平均高度5厘米；第14天，A盆平均高度9厘米，B盆平均高度7厘米",explanation:"A增加3厘米，B增加2厘米；只能比较这两盆的观察结果，不能断言唯一原因。"},
 {id:"lr-03",passageId:"p-plants",skill:"quantify",stem:"第14天两盆豆苗的平均高度相差多少厘米？",options:["1厘米","2厘米","3厘米","4厘米"],answer:1,evidence:"第14天，A盆平均高度9厘米，B盆平均高度7厘米",explanation:"第14天的高度差为9−7=2厘米，不是两盆各自增加的高度。"},
 {id:"lr-04",passageId:"p-plants",skill:"evaluate",stem:"为什么不能由这次观察直接证明是光照造成高度差？",options:["因为所有植物都不需要光","因为两盆高度相同","因为样本很少且还有环境因素没有记录","因为每盆浇水量不同"],answer:2,evidence:"这项观察每组只有一盆，且没有记录温度、实际日照时长等因素",explanation:"样本小、温度等潜在影响因素未测量；观察只能提示假设，不能确立因果。"},
 {id:"lr-05",passageId:"p-library",skill:"locate",stem:"读者每次最多可以借几本纸质书？",options:["2本","3本","4本","没有上限"],answer:1,evidence:"读者每次最多借阅3本纸质书",explanation:"“每次最多”是借阅数量的限制，不是预约领取期限。"},
 {id:"lr-06",passageId:"p-library",skill:"infer",stem:"周五19:00预约成功后，按文中的一般规则最迟应在什么时候领取？",options:["当周周六","下周周一","下周周三","下周周五"],answer:2,evidence:"下周三是第三个开放日",explanation:"开放日顺序为周六、下周二、下周三；第三个开放日是下周三。"},
 {id:"lr-07",passageId:"p-library",skill:"quantify",stem:"如果周二16:30到馆并一直待到18:00，当天最多能在馆停留多少分钟？",options:["30分钟","60分钟","90分钟","120分钟"],answer:2,evidence:"周二至周五16:30—18:00开放",explanation:"16:30到18:00共1小时30分钟，也就是90分钟。"},
 {id:"lr-08",passageId:"p-library",skill:"evaluate",stem:"如果预约期间图书馆临时闭馆，判断领取期限时首先还应核实什么？",options:["是否有馆方临时闭馆公告","其他读者借了几本书","预约书的封面颜色","当天的天气预报"],answer:0,evidence:"临时闭馆时，馆方会在公告中另行说明规则",explanation:"临时情况可能改变通常的开放日计算，应先检查官方公告。"},
 {id:"lr-09",passageId:"p-transit",skill:"locate",stem:"使用纸质时刻表的受访者中有多少人表示满意？",options:["28人","30人","40人","80人"],answer:0,evidence:"使用纸质时刻表的40名受访者中，有28人表示“满意”",explanation:"不要把纸质组的满意人数和手机应用组混淆。"},
 {id:"lr-10",passageId:"p-transit",skill:"infer",stem:"从这次调查可以直接得出的结论是什么？",options:["全国乘客均更喜欢手机应用","此次应用组满意人数比纸质组多2人","使用手机一定让乘车更准时","纸质时刻表一定不准确"],answer:1,evidence:"使用手机应用的40名受访者中，有30人表示“满意”；使用纸质时刻表的40名受访者中，有28人表示“满意”",explanation:"30−28=2人；受访者选择方式和线路可能不同，不支持全国或因果结论。"},
 {id:"lr-11",passageId:"p-transit",skill:"quantify",stem:"应用组在这次调查中的满意人数占该组人数的百分之几？",options:["60%","70%","75%","80%"],answer:2,evidence:"使用手机应用的40名受访者中，有30人表示“满意”",explanation:"30÷40×100%=75%，分母是应用组40人而不是总样本80人。"},
 {id:"lr-12",passageId:"p-transit",skill:"evaluate",stem:"以下哪项最能说明本调查不能证实查询方式本身导致满意差异？",options:["问卷中有人满意","两组人数都为40","调查结果以人数表示","参与者自行选择方式且没有随机分配"],answer:3,evidence:"志愿者是自行选择查询方式的，研究人员没有随机分配",explanation:"组间可能存在原有差异，不能把观察到的组间差别直接归因于查询方式。"},
 {id:"lr-13",passageId:"p-reading",skill:"locate",stem:"阅读小组七天后的回忆测验满分是多少题？",options:["8题","10题","12题","20题"],answer:1,evidence:"测验满分10题",explanation:"12是每组人数，10才是满分题数。"},
 {id:"lr-14",passageId:"p-reading",skill:"infer",stem:"老师对这次结果的恰当态度是什么？",options:["可用于提出下一轮研究问题，但不宜推广为普遍定律","必须立即禁止乙组方法","可以直接断定所有人都适合甲方法","说明两组原有水平完全一样"],answer:0,evidence:"结果可以帮助提出下一轮研究问题，但不应据此断言甲方法对所有学生都更有效",explanation:"这是初步观察，适合形成假设，不代表普遍规律。"},
 {id:"lr-15",passageId:"p-reading",skill:"quantify",stem:"甲组回忆测验的平均答对题数比乙组多多少？",options:["1题","2题","3题","4题"],answer:1,evidence:"甲组平均答对8题，乙组平均答对6题",explanation:"8−6=2题；这是两组平均分的差，不是每个学生都多2题。"},
 {id:"lr-16",passageId:"p-reading",skill:"evaluate",stem:"若希望下一轮更可靠地比较两种复习方法，最优先补充哪个步骤？",options:["只给甲组增加奖励","取消成绩记录","先检测两组起点并记录实际学习时间","减少到每组一人"],answer:2,evidence:"两组学生在开始前并没有进行同等水平的检测，学习时间也未逐一记录",explanation:"控制或记录起点水平与学习时间，有助于减少解释上的混杂。"}
];
export type ReadingItemResult={id:string;passageId:string;skill:ReadingSkillId;chosen:number;answer:number;correct:boolean;evidence:string;explanation:string};
export type ReadingScore={version:"reading-original-v1";correct:number;total:16;
  skills:{id:ReadingSkillId;name:string;correct:number;total:4;practice:string}[];
  items:ReadingItemResult[];nextPractice:string[]};
export function scoreReading(answers:Readonly<Record<string,number>>):ReadingScore|null{
 const ids=new Set(READING_QUESTIONS.map(q=>q.id));
 for(const [id,value] of Object.entries(answers))
  if(!ids.has(id)||!Number.isInteger(value)||value<0||value>3)throw new Error("INVALID_READING_ANSWER");
 if(READING_QUESTIONS.some(q=>!Object.prototype.hasOwnProperty.call(answers,q.id)))return null;
 const items=READING_QUESTIONS.map(q=>({id:q.id,passageId:q.passageId,skill:q.skill,chosen:answers[q.id],
  answer:q.answer,correct:answers[q.id]===q.answer,evidence:q.evidence,explanation:q.explanation}));
 const skills=READING_SKILLS.map(skill=>({
  id:skill.id,name:skill.name,correct:items.filter(i=>i.skill===skill.id&&i.correct).length,total:4 as const,practice:skill.practice
 }));
 // Not a stable ability diagnosis: these are task-specific practice priorities.
 const nextPractice=skills.filter(s=>s.correct<4).sort((a,b)=>a.correct-b.correct)
   .slice(0,2).map(s=>s.practice);
 return {version:"reading-original-v1",correct:items.filter(q=>q.correct).length,total:16,skills,items,nextPractice};
}
export function validateReadingBank():string[]{
 const errors:string[]=[];const ids=new Set<string>();
 if(READING_PASSAGES.length!==4||READING_QUESTIONS.length!==16)errors.push("COUNTS");
 for(const p of READING_PASSAGES){
  if(p.text.length<100||p.source!=="SOCTHINK 原创模拟材料")errors.push("PASSAGE:"+p.id);
 }
 for(const q of READING_QUESTIONS){
  if(ids.has(q.id))errors.push("DUPLICATE:"+q.id);ids.add(q.id);
  const passage=READING_PASSAGES.find(p=>p.id===q.passageId);
  if(!passage||!passage.text.includes(q.evidence))errors.push("EVIDENCE_NOT_IN_TEXT:"+q.id);
  if(!READING_SKILLS.some(s=>s.id===q.skill))errors.push("SKILL:"+q.id);
  if(q.options.length!==4||new Set(q.options).size!==4||q.options.some(x=>!x.trim())||q.answer<0||q.answer>3)errors.push("OPTIONS:"+q.id);
  if(!q.explanation.trim())errors.push("EXPLANATION:"+q.id);
 }
 for(const p of READING_PASSAGES)if(READING_QUESTIONS.filter(q=>q.passageId===p.id).length!==4)errors.push("PASSAGE_COUNT:"+p.id);
 for(const s of READING_SKILLS)if(READING_QUESTIONS.filter(q=>q.skill===s.id).length!==4)errors.push("SKILL_COUNT:"+s.id);
 return errors;
}
