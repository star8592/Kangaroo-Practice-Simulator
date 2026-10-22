/** Market-facing school stages. Grades use the common 1–12 training scale. */
export const SCHOOL_STAGES=[
 {id:'primary',label:'小学',range:'1—6 年级',grades:[1,2,3,4,5,6],description:'口算 · 四则运算 · 小数分数'},
 {id:'junior',label:'初中',range:'7—9 年级',grades:[7,8,9],description:'正负数 · 整式 · 方程 · 根式'},
 {id:'senior',label:'高中',range:'10—12 年级',grades:[10,11,12],description:'函数 · 指数 · 三角 · 数列'}
] as const
export type SchoolStage=typeof SCHOOL_STAGES[number]
export function stageForGrade(grade:number):SchoolStage{
 return SCHOOL_STAGES.find(s=>(s.grades as readonly number[]).includes(grade))||SCHOOL_STAGES[0]
}
/** Display a selected grade without repeating the entire school-stage catalogue. */
export function displayGradeName(grade:number):string{
 const stages=['一','二','三','四','五','六']
 if(grade>=1&&grade<=6&&Number.isInteger(grade))return '小学'+stages[grade-1]+'年级'
 if(grade>=7&&grade<=9&&Number.isInteger(grade))return '初'+stages[grade-7]
 if(grade>=10&&grade<=12&&Number.isInteger(grade))return '高'+stages[grade-10]
 return '选择年级'
}

/** In a visible stage grid, do not repeat the stage prefix on every button. */
export function gradeChoiceName(grade:number):string{
 const long=displayGradeName(grade)
 return grade>=1&&grade<=6?long.replace('小学',''):long
}

export type LearningSnapshot={
 arithmetic?:{sessions?:number;plan?:{summaryZh?:string[];focusSkills?:string[]}}|null
 overview?:{examAttempts?:number}|null
 nextPlan?:Array<{title:string;action:string;evidence?:string}>|null
}|null|undefined
export function learnerNextAction(data:LearningSnapshot){
 const sessions=Math.max(0,Number(data?.arithmetic?.sessions||0))
 if(sessions===0)return{
  title:'先做一轮 20 题计算诊断',
  detail:'不用先看报表；做完这 20 题，才有依据判断哪些计算需要加强。',
  action:'选年级，做20题诊断',mode:'diagnostic' as const,
  evidence:'目前尚无完整计算训练记录，不做能力推断。'
 }
 const recommendation=data?.arithmetic?.plan?.summaryZh?.find(x=>typeof x==='string'&&x.trim().length>0)
 if(recommendation)return{
  title:'接着练最值得提高的一项',
  detail:recommendation,action:'开始今天这一组',mode:'adaptive' as const,
  evidence:'依据当前账号已有计算练习记录；不是竞赛成绩预测。'
 }
 return{
  title:'继续一组短练习',
  detail:'暂时没有稳定的专项结论，先保持练习，做完再观察变化。',
  action:'快速练一组',mode:'adaptive' as const,
  evidence:'数据不足时不显示没有依据的薄弱项与能力评分。'
 }
}
