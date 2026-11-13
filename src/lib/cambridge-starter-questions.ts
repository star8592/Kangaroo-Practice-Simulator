/** Small ORIGINAL diagnostic items, NOT Cambridge official exam questions. */
import type {CambridgeLevel} from "./cambridge-ket-pet";
export type PracticeQuestion=Readonly<{
  id:string;
  exam:CambridgeLevel;
  source:"socthink_original_diagnostic";
  paperPart:1|4|5;
  notice?:string;
  prompt:string;
  options:readonly [string,string,string];
  answerIndex:0|1|2;
  explanationZh:string;
}>;
export const CAMBRIDGE_STARTER_QUESTIONS:readonly PracticeQuestion[]=[
 {id:"ket-01",exam:"ket",source:"socthink_original_diagnostic",paperPart:1,
  notice:"MUSIC CLUB — On Friday this week, the meeting starts at 4:30, not 4:00.",
  prompt:"What does the notice tell students?",
  options:["The Friday meeting is later than usual.","The club has moved to a different day.","Music Club will not meet this Friday."],
  answerIndex:0,explanationZh:"not 4:00，而是4:30，表示比通常时间晚。"},
 {id:"ket-02",exam:"ket",source:"socthink_original_diagnostic",paperPart:1,
  notice:"LIBRARY — Please return all borrowed books before the school holiday begins.",
  prompt:"What must students do?",
  options:["Borrow more books for the holiday.","Take their books back before the holiday.","Read their books inside the library."],
  answerIndex:1,explanationZh:"return borrowed books意为归还借来的书。"},
 {id:"ket-03",exam:"ket",source:"socthink_original_diagnostic",paperPart:4,
  prompt:"When we arrived at the station, the train was already ____.",
  options:["leave","left","gone"],answerIndex:2,
  explanationZh:"was already gone 表示火车已经走了。"},
 {id:"ket-04",exam:"ket",source:"socthink_original_diagnostic",paperPart:4,
  prompt:"Mia usually ____ her homework before dinner.",
  options:["does","do","doing"],answerIndex:0,
  explanationZh:"一般现在时第三人称单数用 does。"},
 {id:"pet-01",exam:"pet",source:"socthink_original_diagnostic",paperPart:1,
  notice:"SCIENCE MUSEUM — Tickets booked online can be collected from the desk next to the main entrance.",
  prompt:"What should visitors who booked online do?",
  options:["Buy another ticket at the main desk.","Collect their tickets near the entrance.","Enter without collecting a ticket."],
  answerIndex:1,explanationZh:"booked online 的参观者需要在主入口旁的服务台领取门票。"},
 {id:"pet-02",exam:"pet",source:"socthink_original_diagnostic",paperPart:1,
  notice:"Team members: the match is on Sunday. Please arrive thirty minutes before it starts to warm up.",
  prompt:"What is the message asking team members to do?",
  options:["Change the day of the match.","Practise for thirty minutes on Saturday.","Be at the venue early on Sunday."],
  answerIndex:2,explanationZh:"arrive thirty minutes before it starts，即周日提前抵达。"},
 {id:"pet-03",exam:"pet",source:"socthink_original_diagnostic",paperPart:5,
  prompt:"Although the weather was cold, we ____ to finish the walk.",
  options:["managed","realised","continued"],answerIndex:0,
  explanationZh:"manage to do sth. 表示设法完成某事。"},
 {id:"pet-04",exam:"pet",source:"socthink_original_diagnostic",paperPart:5,
  prompt:"The teacher asked us to ____ our opinions with examples.",
  options:["depend","support","belong"],answerIndex:1,
  explanationZh:"support an opinion with examples 表示用例子支持观点。"},
] as const;
