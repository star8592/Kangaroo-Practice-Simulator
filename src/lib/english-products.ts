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
  id:"reading",name:"英语阅读",product:"EnglishLeap · 小小阅读星球",subtitle:"互动故事 · 文章阅读 · 理解练习",
  summary:"小学低龄互动绘本与进阶精读分层提供，先按年龄选择适合的阅读路径。",
  href:"/english/reading",serviceUrl:"/english/reading/app/",
  serviceCta:"体验阅读课程",availability:"public-app",statusText:"少儿绘本正式开放 · 进阶精读体验",
  icon:"R",capability:"english.reading",
  detail:"少儿英语绘本已提供免费正式阅读入口；EnglishLeap 保留进阶精读。前者暂不生成正式成绩，后者的完整教学与付费尚待验收。",
 },
 {
  id:"aelos",name:"高阶阅读",product:"AelOS",subtitle:"复杂篇章 · 深度理解 · 阅读分析",
  summary:"以高阶阅读为核心，通过篇章理解、词汇分析与能力图谱组织深入学习；其他训练工具作为辅助。",
  href:"/english/aelos",serviceUrl:"/english/aelos/app/library",
  serviceCta:"进入高阶阅读",availability:"login-app",statusText:"AelOS 高阶阅读入口已接入",
  icon:"OS",capability:"english.aelos",
  detail:"AelOS 是偏高阶的阅读学习应用，阅读训练和分析是产品主线；词汇、目标与成长页面为辅助功能。学习数据与 AI 能力仍须登录及运行态验收，课程难度标识不是蓝思官方认证。",
 },
] as const;

export type EnglishProductId = typeof ENGLISH_PRODUCTS[number]["id"];
export function englishProduct(id:EnglishProductId){
 const result=ENGLISH_PRODUCTS.find(p=>p.id===id);
 if(!result)throw new Error("Unknown English product: "+id);
 return result;
}
