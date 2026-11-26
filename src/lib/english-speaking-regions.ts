/** Public read-only projection of AccentLab regional exam catalog.
 * Not an independent question bank, scorer, payment or exam-session authority.
 * Existing engine guides: AccentLab frontend/src/data/officialExamGuides.ts.
 * Wuhan source: supplied implementation-plan scan, original pp.2–4; public link pending.
 */
export const ENGLISH_SPEAKING_ROOT="/assessments/english-speaking";
const ENGINE="/english/pronunciation/app";
export type SpeakingRegion={
 city:string; year:string; cityName:string; paperId:string; status:string;
 summary:string; facts:readonly (readonly [string,string])[];
 skills:readonly (readonly [string,string])[];
 papers:readonly {label:string;note:string;version?:string;pack?:"A"|"B"}[];
 sources:readonly {label:string;url:string}[]; caution:string;
 drills?:readonly {name:string;id:string;skill?:string}[];
};
const twoPapers=[{label:"原创模拟卷 A",note:"地区题型训练",pack:"A"},{label:"原创模拟卷 B",note:"不同原创材料",pack:"B"}] as const;
export const SPEAKING_REGIONS:readonly SpeakingRegion[]=[
 {city:"wuhan",year:"2027",cityName:"武汉",paperId:"wuhan-2027",status:"所获实施方案列明四题型；详细参数待核",
 summary:"根据所获2027年全市初中毕业生学业水平考试英语听说机考实施方案扫描件（原页2–4），人机对话、单人单机；成绩与英语纸笔考试成绩一并公布。",
 facts:[["考试日期","4月17—18日"],["满分","30分"],["每场含考务","30分钟"],["缓考","4月19日"]],
 skills:[["听后选择","听取对话或独白，选择正确信息。"],["听后应答","听懂问题，组织英语回答。"],["模仿朗读","先听示范，再模仿录音。"],["听后转述","提取信息并用英语转述。"]],
 papers:[{label:"W2 · 均衡四模块",note:"18项 · 20分钟教学训练",version:"W2"},{label:"W1 · 选择应答强化",note:"22项 · 25分钟教学训练",version:"W1"},{label:"W3 · 转述强化",note:"15项 · 18分钟教学训练",version:"W3"}],
 drills:[{name:"听后选择",id:"scene-museum-meeting"},{name:"听后应答",id:"answer-gift-budget"},{name:"模仿朗读",id:"read-trees"},{name:"听后转述",id:"retell-river-cleanup"}],
 sources:[{label:"湖北省教育厅：统一命题及机考政策（省级背景）",url:"https://jyt.hubei.gov.cn/zfxxgk/zc_GK2020/gfxwj_GK2020/202306/t20230629_4727322.shtml"}],
 caution:"武汉扫描件公开发布链接、完整发文页待核；净答题时长、题量、正式题序、细项分值、播放次数与评分细则未在所获文件列明。W4/W5仅保留拓展练习。"},
 {city:"beijing",year:"2026",cityName:"北京",paperId:"beijing-2026",status:"2026赛制参考；非2027正式试卷",
 summary:"按现有北京2026版资料训练四类听说能力，模拟身份核验、耳麦和键盘检测、单向限时作答。",
 facts:[["2026满分","40分"],["2026考试时长","约30分钟"],["题型","四类"],["训练套卷","A / B"]],
 skills:[["听后选择","听音理解并选择答案。"],["听后回答","口头组织答案。"],["听后转述","听取信息并转述。"],["短文朗读","按屏幕文本朗读。"]],papers:twoPapers,
 drills:[{name:"听后选择",id:"scene-science-room"},{name:"听后回答",id:"bj-answer-science-club"},{name:"听后转述",id:"retell-bees"},{name:"短文朗读",id:"read-octopus"}],
 sources:[{label:"北京教育考试院：2026年英语听说机考问答",url:"https://www.bjeea.cn/html/zkzz/faq/2025/1210/87740.html"},{label:"北京教育考试院：2027年初中学考报名通知",url:"https://bjksb.bjeea.cn/html/zkzz/zkzc/2026/1102/88448.html"}],
 caution:"当前模拟引擎版本为北京2026，不能改名冒充2027同版；逐题秒数及评分为训练参数。"},
 {city:"shanghai",year:"2026",cityName:"上海",paperId:"shanghai-2026",status:"2026公开赛制参考",
 summary:"2026版人机对话听说测试。训练覆盖朗读、交际应答、听后复述和话题表达。",
 facts:[["2026满分","10分"],["2026时长","10分钟"],["训练套卷","A / B"]],
 skills:[["朗读","词组与句子朗读。"],["交际应答","根据语境自然回应。"],["听后复述","提取信息并组织语言。"],["话题表达","围绕话题组织英语。"]],papers:twoPapers,
 drills:[{name:"词组朗读",skill:"朗读",id:"sh26-a-phrase-1"},{name:"句子朗读",skill:"朗读",id:"sh26-a-sentence-1"},{name:"交际应答",id:"sh-a-response-1"},{name:"听后复述",id:"sh26-a-retell"},{name:"话题表达",id:"sh26-a-free-talk"}],
 sources:[{label:"上海市教育考试院：2026线上模拟练习通知",url:"https://www.shmeea.edu.cn/page/08000/20260415/20174.html"}],
 caution:"细分题量与逐题时限是教学设定，未与官方同版逐屏校准。"},
 {city:"shanghai",year:"2027",cityName:"上海",paperId:"shanghai-2027",status:"2027研究候选；正式细则待核",
 summary:"沿用现有上海2027候选训练，重点观察朗读句子方向与交际应答，不能作为已公布的正式赛制。",
 facts:[["训练时长","10分钟（教学设定）"],["训练题量","10项（候选）"],["正式分值","待核"]],
 skills:[["句子朗读","候选训练方向。"],["交际应答","训练语境理解和回答。"],["听后复述","整理信息并转述。"],["话题表达","独立组织英语。"]],papers:twoPapers,
 drills:[{name:"句子朗读",id:"sh27-a-sentence-1"},{name:"交际应答",id:"sh27-a-response-1"},{name:"听后复述",id:"sh27-a-retell"},{name:"话题表达",id:"sh27-a-free-talk"}],
 sources:[{label:"上海市教育考试院：2026线上模拟练习通知（历史参照）",url:"https://www.shmeea.edu.cn/page/08000/20260415/20174.html"}],
 caution:"2027详细题型、题量、分值和逐题时间未获同年正式文件验证。"},
 {city:"guangzhou",year:"2027",cityName:"广州",paperId:"guangzhou-2027",status:"现有2027—2029公布结构资料",
 summary:"按现有广州2027—2029资料设置模仿朗读、信息获取、角色扮演三部分原创模拟。",
 facts:[["满分","30分"],["题量","14小题"],["考试时长","约20分钟"],["题型","三部分"]],
 skills:[["模仿朗读","1题，8分。"],["信息获取","听选6题9分，回答4题4分。"],["角色扮演","复述7分、询问1分、回答1分，各1题。"]],papers:twoPapers,
 drills:[{name:"模仿朗读",id:"gz-read-octopus"},{name:"听后选择",skill:"信息获取",id:"scene-science-start"},{name:"听后回答",skill:"信息获取",id:"gz-info-answer-park"},{name:"信息复述",skill:"角色扮演",id:"gz-role-retell-garden"},{name:"询问",skill:"角色扮演",id:"gz-role-inquiry"},{name:"回答",skill:"角色扮演",id:"gz-role-answer"}],
 sources:[{label:"广州招考：2027—2029年考试安排与试卷结构",url:"https://gzzk.gz.gov.cn/gkmlpt/content/10/10582/mpost_10582286.html"}],
 caution:"2027正式客户端、逐题秒数及播音规则未逐屏核验；上述分值不能直接套到AI参考分。"}
];
export const regionPath=(r:Pick<SpeakingRegion,"city"|"year">)=>ENGLISH_SPEAKING_ROOT+"/"+r.city+"/"+r.year;
export const regionByYear=(city:string,year:string)=>SPEAKING_REGIONS.find(r=>r.city===city&&r.year===year);
export const cityDefault=(city:string)=>SPEAKING_REGIONS.find(r=>r.city===city);
export function regionExamHref(r:SpeakingRegion,p:SpeakingRegion["papers"][number],mode:"simulation"|"practice",focus?:string){
 const q=new URLSearchParams({paper:r.paperId,mode});
 if(p.version)q.set("version",p.version);
 if(p.pack)q.set("pack",p.pack);
 if(focus&&mode==="practice")q.set("focus",focus);
 return ENGINE+"/exam-simulator?"+q.toString();
}
export const WUHAN_SESSIONS=[["08:30–09:00","09:10–09:40","09:50–10:20"],["10:30–11:00","11:10–11:40","11:50–12:20"],["14:00–14:30","14:40–15:10","15:20–15:50"],["16:00–16:30","16:40–17:10","17:20–17:50"]] as const;
