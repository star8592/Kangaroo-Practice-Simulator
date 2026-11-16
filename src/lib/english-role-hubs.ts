/**
 * Role-based navigation adapters for the existing English product catalog.
 * These are ROUTES, not entitlement claims or cross-product grade aggregation.
 * Every product continues to enforce its own classroom/learner permissions.
 */
import {ENGLISH_PRODUCTS,type EnglishProductId} from "./english-products";

export type EnglishAudience="teacher"|"student";
type RoleRoute={
  url:string;
  action:string;
  description:string;
};
const ROLE_ROUTES={
  pronunciation:{
    teacher:{url:"/english/pronunciation/app/teacher/homework",
      action:"进入发音教学工作台",description:"管理跟读作业、班级与评分；由发音课堂核验教师权限。"},
    student:{url:"/english/pronunciation/app/practice-library",
      action:"开始发音练习",description:"听示范、自动跟读和查看发音反馈；班级作业以老师的链接为准。"},
  },
  vocabulary:{
    teacher:{url:"/english/vocabulary/app/teacher/access",
      action:"进入单词教学工作台",description:"管理单词班级、布置复习与查看学情；首次关联原教师账号一次。"},
    student:{url:"/english/vocabulary/app/app/classroom",
      action:"进入我的单词课堂",description:"接收单词任务、复习和查看进度；首次关联原学生账号一次。"},
  },
  reading:{
    teacher:{url:"/english/reading/app/",
      action:"浏览阅读课程内容",description:"目前开放阅读内容，尚未接入统一班级作业和教师学情。"},
    student:{url:"/english/reading/kids/",
      action:"打开英语阅读",description:"从少儿故事开始，也可进入进阶文章阅读；不同课程的记录仍独立。"},
  },
  aelos:{
    teacher:{url:"/english/aelos/app/library",
      action:"浏览高阶阅读资源",description:"当前是课程浏览入口，尚未接入统一布置作业及班级管理。"},
    student:{url:"/english/aelos/app/library",
      action:"进入高阶阅读",description:"阅读长篇文章与分析能力训练；按原产品实际开放范围使用。"},
  },
} as const satisfies Record<EnglishProductId,Record<EnglishAudience,RoleRoute>>;

export function englishRoleEntries(audience:EnglishAudience){
  return ENGLISH_PRODUCTS.map(product=>{
    const route=ROLE_ROUTES[product.id][audience];
    const classroomReady=product.classroomMode!=="not-integrated";
    return {
      id:product.id,name:product.name,product:product.product,icon:product.icon,
      url:route.url,action:route.action,description:route.description,
      classroomReady:audience==="teacher"&&classroomReady,
      federationStatus:product.federationStatus,
    };
  });
}
