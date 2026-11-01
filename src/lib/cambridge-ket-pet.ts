/**
 * Source-of-truth A2 Key for Schools / B1 Preliminary for Schools formats.
 * Cambridge public-format facts are NOT permission to republish their papers.
 * Any "full mock" requires a separate complete, reviewed content manifest.
 * Verified 2026-10-31.
 */
export type CambridgeLevel = "ket" | "pet";
export type CambridgePart = Readonly<{
  number: number;
  title: string;
  format: "multiple_choice" | "multiple_matching" | "multiple_choice_cloze" |
    "open_cloze" | "guided_email" | "picture_story" | "gapped_text" |
    "email" | "article_or_story" | "listening_gap_fill" |
    "listening_matching" | "speaking_interview" | "speaking_discussion" |
    "speaking_photo" | "speaking_general";
  questions: number | null;
  minimumWords?: number;
  targetWords?: number;
  choiceBetweenPrompts?: boolean;
  maxPointsEach?: number;
}>;
export type CambridgePaper = Readonly<{
  id: "reading_writing" | "reading" | "writing" | "listening" | "speaking";
  zh: string;
  minutes: number | null;
  approximatePairMinutes?: Readonly<[number, number]>;
  weightingPercent: number;
  parts: readonly CambridgePart[];
  audioPlayedTwice?: true;
  paperTransferMinutesIncluded?: number;
}>;
export type CambridgeExam = Readonly<{
  id: CambridgeLevel;
  title: string;
  cefr: "A2" | "B1";
  scaleScoreBand: Readonly<[number,number]>;
  schoolVariant: true;
  status: "format_verified_content_pending";
  digitalAndPaperTasksEquivalent: true;
  sourceFormatUrl: string;
  sourcePreparationUrl: string;
  papers: readonly CambridgePaper[];
}>;

export const CAMBRIDGE_EXAMS: Record<CambridgeLevel, CambridgeExam> = {
  ket: {
    id: "ket", title: "A2 Key for Schools (KET)", cefr: "A2",
    scaleScoreBand: [120, 139], schoolVariant: true,
    status: "format_verified_content_pending",digitalAndPaperTasksEquivalent: true,
    sourceFormatUrl: "https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/format/",
    sourcePreparationUrl: "https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/preparation/",
    papers: [
      {id:"reading_writing",zh:"阅读与写作",minutes:60,weightingPercent:50,parts:[
        {number:1,title:"短文本理解",format:"multiple_choice",questions:6},
        {number:2,title:"多文本匹配",format:"multiple_matching",questions:7},
        {number:3,title:"长文本阅读理解",format:"multiple_choice",questions:5},
        {number:4,title:"词汇选择填空",format:"multiple_choice_cloze",questions:6},
        {number:5,title:"开放式填空",format:"open_cloze",questions:6},
        {number:6,title:"邮件/便条写作",format:"guided_email",questions:1,minimumWords:25,maxPointsEach:15},
        {number:7,title:"三图故事写作",format:"picture_story",questions:1,minimumWords:35,maxPointsEach:15},
      ]},
      {id:"listening",zh:"听力",minutes:30,weightingPercent:25,audioPlayedTwice:true,paperTransferMinutesIncluded:6,parts:[
        {number:1,title:"图片选择",format:"multiple_choice",questions:5},
        {number:2,title:"听录音补全信息",format:"listening_gap_fill",questions:5},
        {number:3,title:"对话细节选择",format:"multiple_choice",questions:5},
        {number:4,title:"短对话/独白主旨",format:"multiple_choice",questions:5},
        {number:5,title:"对话内容匹配",format:"listening_matching",questions:5},
      ]},
      {id:"speaking",zh:"口语（真人两人考官与考生互动）",minutes:null,approximatePairMinutes:[8,10],weightingPercent:25,parts:[
        {number:1,title:"基本信息问答",format:"speaking_interview",questions:null},
        {number:2,title:"两人主题交流",format:"speaking_discussion",questions:null},
      ]},
    ],
  },
  pet: {
    id: "pet",title:"B1 Preliminary for Schools (PET)",cefr:"B1",
    scaleScoreBand:[140,159],schoolVariant:true,
    status:"format_verified_content_pending",digitalAndPaperTasksEquivalent:true,
    sourceFormatUrl:"https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/",
    sourcePreparationUrl:"https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/preparation/",
    papers:[
      {id:"reading",zh:"阅读",minutes:45,weightingPercent:25,parts:[
        {number:1,title:"短告示/消息理解",format:"multiple_choice",questions:5},
        {number:2,title:"人群与文本匹配",format:"multiple_matching",questions:5},
        {number:3,title:"长文本阅读理解",format:"multiple_choice",questions:5},
        {number:4,title:"句子还原",format:"gapped_text",questions:5},
        {number:5,title:"词汇选择填空",format:"multiple_choice_cloze",questions:6},
        {number:6,title:"开放式填空",format:"open_cloze",questions:6},
      ]},
      {id:"writing",zh:"写作",minutes:45,weightingPercent:25,parts:[
        {number:1,title:"邮件写作",format:"email",questions:1,targetWords:100,maxPointsEach:20},
        {number:2,title:"文章/故事二选一",format:"article_or_story",questions:1,targetWords:100,maxPointsEach:20,choiceBetweenPrompts:true},
      ]},
      {id:"listening",zh:"听力",minutes:30,weightingPercent:25,audioPlayedTwice:true,paperTransferMinutesIncluded:6,parts:[
        {number:1,title:"图片选择",format:"multiple_choice",questions:7},
        {number:2,title:"六段短对话",format:"multiple_choice",questions:6},
        {number:3,title:"独白信息填空",format:"listening_gap_fill",questions:6},
        {number:4,title:"访谈细节理解",format:"multiple_choice",questions:6},
      ]},
      {id:"speaking",zh:"口语（考生两人/三人）",minutes:null,approximatePairMinutes:[10,12],weightingPercent:25,parts:[
        {number:1,title:"面试问答",format:"speaking_interview",questions:null},
        {number:2,title:"照片描述",format:"speaking_photo",questions:null},
        {number:3,title:"共同讨论",format:"speaking_discussion",questions:null},
        {number:4,title:"延伸话题交流",format:"speaking_general",questions:null},
      ]},
    ],
  },
} as const;

/** Strict gate: format only is not a "full mock exam". */
export type ContentPart = Readonly<{
  paperId: string;
  partNumber: number;
  independentlyReviewedQuestionCount: number;
  audioComplete: boolean;
  rightsCleared: boolean;
  speakingPromptReviewed?: boolean;
  examinerRubricReady?: boolean;
}>;
export function fullMockBankCompleteness(level: CambridgeLevel, parts: readonly ContentPart[]) {
  const spec=CAMBRIDGE_EXAMS[level];
  const required=spec.papers.flatMap(paper=>paper.parts.map(part=>({
    paperId:paper.id,partNumber:part.number,
    requiredQuestions:part.questions,
    requiresAudio:paper.id==="listening",
  })));
  const failures:string[]=[];
  const names=new Set(parts.map(p=>p.paperId+":"+p.partNumber));
  if(names.size!==parts.length)failures.push("duplicate_content_part");
  for(const r of required){
    const item=parts.find(p=>p.paperId===r.paperId&&p.partNumber===r.partNumber);
    if(!item ||
       (r.requiredQuestions===null
        ? (!item.speakingPromptReviewed || !item.examinerRubricReady)
        : item.independentlyReviewedQuestionCount!==r.requiredQuestions) ||
       !item.rightsCleared || (r.requiresAudio&&!item.audioComplete)){
      failures.push("incomplete_part:"+r.paperId+":"+r.partNumber);
    }
  }
  return {ready:failures.length===0&&names.size===required.length,requiredParts:required.length,failures};
}
