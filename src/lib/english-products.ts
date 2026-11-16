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
  managementUrl:"/english/pronunciation/app/teacher/homework",
  authMode:"main-wechat",classroomMode:"main-classroom",federationStatus:"native",
  detail:"独立发音应用已提供语料书架、示范音与跟读界面。真人评分精度、多用户账号与付费权益仍待独立验收。",
 },
 {
  id:"vocabulary",name:"单词学习",product:"词语星球",subtitle:"记单词 · 复习 · 阶段检测",
  summary:"单词练习、间隔复习与班级任务在独立单词课堂中完成；学生、老师和家长使用各自入口。",
  href:"/english/vocabulary",serviceUrl:"/english/vocabulary/app/",
  serviceCta:"打开单词课堂",availability:"login-app",statusText:"主站单词课堂已接入",
  icon:"W",capability:"english.vocabulary",
  managementUrl:"/english/vocabulary/app/teacher/access",
  authMode:"product-native",classroomMode:"product-native",federationStatus:"not-integrated",
  detail:"独立 Rust / Vue / PostgreSQL 课堂已经部署；真实班级验收、监护与收费开通不等同于页面已可访问。",
 },
 {
  id:"reading",name:"历史阅读记录",product:"EnglishLeap（历史兼容）",subtitle:"旧笔记 · 学习记录 · 数据导出",
  summary:"EnglishLeap 已不再作为新阅读产品继续开发。请在旧工作台备份本地学习记录；新的英语分级阅读与文章训练由 AelOS 提供。",
  href:"/english/reading",serviceUrl:"/english/reading/app/progress",
  serviceCta:"导出旧学习记录",availability:"public-app",statusText:"历史功能仅供兼容及备份",
  icon:"R",capability:"english.reading",managementUrl:null,
  authMode:"public-preview",classroomMode:"not-integrated",federationStatus:"not-integrated",
  detail:"旧文章、导图、纸书笔记和写作草稿可能仅保存在原浏览器。迁移到 AelOS 前需用户自行导出并核对备份，不能自动跨账户同步。",
 },
 {
  id:"aelos",name:"英语阅读",product:"AelOS",subtitle:"自由选文 · 分级精读 · 理解与表达",
  summary:"以 Article 文章为核心、Library 为入口，结合分级阅读、理解测评、文章复述及写作练习，目标和成长图谱辅助长期阅读。",
  href:"/english/aelos",serviceUrl:"/english/aelos/app/library",
  serviceCta:"开始阅读学习",availability:"login-app",statusText:"AelOS 阅读学习入口已接入",
  icon:"R+",capability:"english.aelos",managementUrl:null,
  authMode:"product-native",classroomMode:"not-integrated",federationStatus:"not-integrated",
  detail:"AelOS 是以阅读为主线的英语综合学习应用；文章内听说写是同一篇内容的学习活动，不替代 AccentLab 专项听说考试。账号、历史数据与收费仍以独立真实验收为准。",
 },
] as const;

export type EnglishProductId = typeof ENGLISH_PRODUCTS[number]["id"];
export function englishProduct(id:EnglishProductId){
 const result=ENGLISH_PRODUCTS.find(p=>p.id===id);
 if(!result)throw new Error("Unknown English product: "+id);
 return result;
}

/** This is the sole public registry for English products and their current
 * integration truth.  authMode/classroomMode are STATUS, never grants.
 * managementUrl is internal UI routing metadata, NEVER a permission check;
 * the product server independently verifies identity and class membership.
 * Product backends remain authoritative for their private records and roles.
 */
export const ENGLISH_PLATFORM_CATALOG_VERSION = 1 as const;
export function englishPlatformCatalog() {
 return {
  schemaVersion: ENGLISH_PLATFORM_CATALOG_VERSION,
  products: ENGLISH_PRODUCTS.map(({id,name,product,href,serviceUrl,capability,availability,
    authMode,classroomMode,federationStatus})=>({
     id,name,product,href,serviceUrl,capability,availability,
     authMode,classroomMode,federationStatus,
  })),
 } as const;
}
