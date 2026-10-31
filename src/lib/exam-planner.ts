export const EXAM_MILESTONE_TYPES = [
  {id:"registration",zh:"报名截止",en:"Registration deadline"},
  {id:"written",zh:"笔试 / 正式考试",en:"Written / main exam"},
  {id:"interview",zh:"面试 / 复试",en:"Interview / next round"},
  {id:"documents",zh:"资格复审 / 准考证",en:"Documents / admission ticket"},
  {id:"results",zh:"成绩公布",en:"Results"},
  {id:"other",zh:"其他重要日期",en:"Other milestone"},
] as const;

export type ExamMilestoneType = typeof EXAM_MILESTONE_TYPES[number]["id"];
export type ExamPlannerEntry = {
  id:string;
  domainId:string;
  title:string;
  stage:ExamMilestoneType;
  date:string;
  time:string;
  location:string;
  notes:string;
  remindDays:number;
};

export const EXAM_PLANNER_STORAGE_KEY = "socthink.exam-planner.local.v1";

export function isDateString(value:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split("-").map(Number);
  const date=new Date(y,m-1,d);
  return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d;
}

export function normalizeExamEntries(value:unknown,domainIds:readonly string[]):ExamPlannerEntry[]{
  if(!Array.isArray(value))return [];
  const allowed=new Set<string>(domainIds);
  const stages=new Set<string>(EXAM_MILESTONE_TYPES.map(x=>x.id));
  return value.slice(0,100).flatMap((raw):ExamPlannerEntry[]=>{
    if(!raw || typeof raw!=="object")return [];
    const row=raw as Record<string,unknown>;
    if(typeof row.id!=="string" || !/^[a-zA-Z0-9-]{4,100}$/.test(row.id) ||
      typeof row.title!=="string" || !row.title.trim() || row.title.length>120 ||
      typeof row.domainId!=="string" || !allowed.has(row.domainId) ||
      typeof row.stage!=="string" || !stages.has(row.stage) ||
      typeof row.date!=="string" || !isDateString(row.date))return [];
    const time=typeof row.time==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time)?row.time:"";
    const location=typeof row.location==="string"?row.location.slice(0,180):"";
    const notes=typeof row.notes==="string"?row.notes.slice(0,400):"";
    const remindDays=[1,3,7].includes(Number(row.remindDays))?Number(row.remindDays):1;
    return [{
      id:row.id,domainId:row.domainId,title:row.title.trim(),
      stage:row.stage as ExamMilestoneType,date:row.date,time,location,notes,remindDays,
    }];
  }).sort((a,b)=>(a.date+"T"+(a.time||"00:00")).localeCompare(b.date+"T"+(b.time||"00:00")));
}

function icsEscape(s:string):string {
  return s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
}
function icsStamp(date:Date):string {
  return date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
}
function icsDateTime(date:Date):string {
  const two=(n:number)=>String(n).padStart(2,"0");
  return String(date.getFullYear())+two(date.getMonth()+1)+two(date.getDate())+
    "T"+two(date.getHours())+two(date.getMinutes())+"00";
}

/** Export local milestones as an explicit, user-imported calendar file.
 * VALARM is a request to a calendar app, not a guarantee of a push delivery. */
export function exportExamPlannerIcs(entries:ExamPlannerEntry[],now=new Date()):string {
  const output=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SOCTHINK//Exam Planner//ZH",
    "CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:"+icsEscape("SOCTHINK 考试管理")];
  for(const row of entries){
    if(!isDateString(row.date))continue;
    const [year,month,day]=row.date.split("-").map(Number);
    const hasTime=/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time);
    const start=hasTime?new Date(year,month-1,day,Number(row.time.slice(0,2)),Number(row.time.slice(3,5))):
      new Date(year,month-1,day);
    const end=new Date(start.getTime()+(hasTime?60*60*1000:24*60*60*1000));
    const label=EXAM_MILESTONE_TYPES.find(x=>x.id===row.stage)?.zh||"考试事项";
    output.push("BEGIN:VEVENT",
      "UID:"+icsEscape(row.id+"@socthink.cn"),
      "DTSTAMP:"+icsStamp(now),
      "SUMMARY:"+icsEscape(row.title+" · "+label));
    if(hasTime)output.push("DTSTART:"+icsDateTime(start),"DTEND:"+icsDateTime(end));
    else output.push("DTSTART;VALUE=DATE:"+row.date.replace(/-/g,""),
      "DTEND;VALUE=DATE:"+icsDateTime(end).slice(0,8));
    if(row.location)output.push("LOCATION:"+icsEscape(row.location));
    const desc=["用户自行填写的日期，请以考试主办方最新公告为准。",row.notes].filter(Boolean).join("\n");
    output.push("DESCRIPTION:"+icsEscape(desc),
      "BEGIN:VALARM","ACTION:DISPLAY",
      "DESCRIPTION:"+icsEscape(row.title+" · "+label),
      "TRIGGER:-P"+row.remindDays+"D","END:VALARM","END:VEVENT");
  }
  output.push("END:VCALENDAR");
  return output.join("\r\n")+"\r\n";
}
