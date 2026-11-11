/**
 * Independent English products under the SOC THINK discovery/navigation hub.
 * THIS IS NOT an authorization or billing registry. Only service backends
 * may grant paid access after checking verified order entitlements.
 * Never proxy/copy private student records or cross-domain session cookies.
 */
export const ENGLISH_PRODUCTS = [
 {
  id:"pronunciation",name:"发音训练",product:"AccentLab",subtitle:"听示范 · 跟读 · 纠音",
  summary:"先听标准示范，再完成跟读和录音练习。复杂的分析功能留在独立发音工作台。",
  href:"/english/pronunciation",serviceUrl:"/english/pronunciation/app/practice-library",
  serviceCta:"打开发音练习",availability:"public-app",statusText:"主站发音训练已开放",
  icon:"Aa",capability:"english.pronunciation",
  detail:"独立发音应用已提供语料书架、示范音与跟读界面。真人评分精度、多用户账号与付费权益仍待独立验收。",
 },
 {
  id:"vocabulary",name:"单词学习",product:"词语星球",subtitle:"记单词 · 复习 · 阶段检测",
  summary:"单词练习、间隔复习与班级任务在独立单词课堂中完成；学生、老师和家长使用各自入口。",
  href:"/english/vocabulary",serviceUrl:"/english/vocabulary/app/",
  serviceCta:"打开单词课堂",availability:"login-app",statusText:"主站单词课堂已接入",
  icon:"W",capability:"english.vocabulary",
  detail:"独立 Rust / Vue / PostgreSQL 课堂已经部署；真实班级验收、监护与收费开通不等同于页面已可访问。",
 },
 {
  id:"reading",name:"英语阅读",product:"EnglishLeap",subtitle:"分级阅读 · 精读 · 理解",
  summary:"按文章阅读中英段落、积累词汇、梳理思维导图和完成理解练习。",
  href:"/english/reading",serviceUrl:"/english/reading/app/",
  serviceCta:"体验阅读课程",availability:"public-app",statusText:"阅读体验入口已接入主站",
  icon:"R",capability:"english.reading",
  detail:"EnglishLeap 已在 SOC THINK 主站提供阅读体验入口。课程列表可读取，但部分书库、口音接口尚待补齐，完整教学与付费流程未验收，不作为成熟付费课程宣传。",
 },
 {
  id:"aelos",name:"综合英语",product:"AelOS",subtitle:"阅读能力 · 听说读写 · AI 学习规划",
  summary:"以每日学习任务组织阅读、词汇、听说读写与能力图谱，并逐步调整个人学习路线。",
  href:"/english/aelos",serviceUrl:"/english/aelos/app/",
  serviceCta:"打开 AelOS",availability:"login-app",statusText:"主站综合英语已接入",
  icon:"OS",capability:"english.aelos",
  detail:"独立仓库 star8592/aelos。现有公网应用有阅读、词汇、目标、成长等页面；学习数据与 AI 功能需独立登录及运行态验收。分级难度参考不等于蓝思官方认证。",
 },
] as const;

export type EnglishProductId = typeof ENGLISH_PRODUCTS[number]["id"];
export function englishProduct(id:EnglishProductId){
 const result=ENGLISH_PRODUCTS.find(p=>p.id===id);
 if(!result)throw new Error("Unknown English product: "+id);
 return result;
}
