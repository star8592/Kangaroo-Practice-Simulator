/**
 * SOCTHINK oral-exam simulation formats, distinct from publishable question
 * content and scoring engines. Exam brands refer to third-party qualifications;
 * these are UNOFFICIAL practice blueprints, not endorsed scores/certificates.
 *
 * Every format is explicitly versioned and currently NOT live. This registry
 * must never grant a public start/payment route on its own.
 */
export type OralExamId = "cambridge-a2-key" | "cambridge-b1-preliminary" |
  "ielts-speaking" | "toefl-ibt-speaking-2026" | "pte-academic-speaking";
export type OralMode = "full-mock" | "coached-practice";
export type OralTask =
  "examiner-interview" | "partner-discussion" | "photo-description" |
  "individual-long-turn" | "extended-discussion" | "listen-and-repeat" |
  "computer-interview" | "read-aloud" | "repeat-sentence" |
  "describe-image" | "retell-lecture" | "respond-to-situation" |
  "summarize-group-discussion" | "short-answer";
export type OralSection = Readonly<{
  id: string;
  order: number;
  taskTypes: readonly OralTask[];
  minMinutes?: number;
  maxMinutes?: number;
  requiresVirtualPartner: boolean;
  examinerPrompts: boolean;
}>;
export type OralExamBlueprint = Readonly<{
  id: OralExamId;
  version: string;
  /** Exam format effective date, not SOCTHINK content availability. */
  effectiveFrom?: string;
  officialSource: string;
  verifiedAt: string;
  status: "planned";
  approximateDurationMinutes?: readonly [number, number];
  examinerCount: 0 | 1 | 2;
  virtualPartnerRequired: boolean;
  sections: readonly OralSection[];
  rubricDimensions: readonly string[];
  unofficialPractice: true;
}>;

export const ORAL_EXAMS: readonly OralExamBlueprint[] = [
  {
    id:"cambridge-a2-key", version:"a2-key-speaking-2026",
    officialSource:"https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/format/",
    verifiedAt:"2026-10-30", status:"planned",
    approximateDurationMinutes:[8,10], examinerCount:2, virtualPartnerRequired:true,
    sections:[
      {id:"interview",order:1,taskTypes:["examiner-interview"],minMinutes:3,maxMinutes:4,requiresVirtualPartner:false,examinerPrompts:true},
      {id:"discussion",order:2,taskTypes:["partner-discussion"],minMinutes:5,maxMinutes:6,requiresVirtualPartner:true,examinerPrompts:true},
    ],
    rubricDimensions:["grammar-vocabulary","pronunciation","interactive-communication","global-achievement"],
    unofficialPractice:true,
  },
  {
    id:"cambridge-b1-preliminary", version:"b1-preliminary-speaking-2026",
    officialSource:"https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/",
    verifiedAt:"2026-10-30",status:"planned",
    approximateDurationMinutes:[10,12],examinerCount:2,virtualPartnerRequired:true,
    sections:[
      {id:"interview",order:1,taskTypes:["examiner-interview"],requiresVirtualPartner:false,examinerPrompts:true},
      {id:"photo",order:2,taskTypes:["photo-description"],requiresVirtualPartner:false,examinerPrompts:true},
      {id:"paired-discussion",order:3,taskTypes:["partner-discussion"],requiresVirtualPartner:true,examinerPrompts:true},
      {id:"conversation",order:4,taskTypes:["extended-discussion"],requiresVirtualPartner:false,examinerPrompts:true},
    ],
    rubricDimensions:["grammar-vocabulary","discourse-management","pronunciation","interactive-communication","global-achievement"],
    unofficialPractice:true,
  },
  {
    id:"ielts-speaking",version:"ielts-speaking-2026",
    officialSource:"https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking",
    verifiedAt:"2026-10-30",status:"planned",
    approximateDurationMinutes:[11,14],examinerCount:1,virtualPartnerRequired:false,
    sections:[
      {id:"part-1",order:1,taskTypes:["examiner-interview"],minMinutes:4,maxMinutes:5,requiresVirtualPartner:false,examinerPrompts:true},
      {id:"part-2",order:2,taskTypes:["individual-long-turn"],minMinutes:3,maxMinutes:4,requiresVirtualPartner:false,examinerPrompts:true},
      {id:"part-3",order:3,taskTypes:["extended-discussion"],minMinutes:4,maxMinutes:5,requiresVirtualPartner:false,examinerPrompts:true},
    ],
    rubricDimensions:["fluency-coherence","lexical-resource","grammar-range-accuracy","pronunciation"],
    unofficialPractice:true,
  },
  {
    id:"toefl-ibt-speaking-2026",version:"toefl-ibt-2026-01-21",effectiveFrom:"2026-01-21",
    officialSource:"https://www.ets.org/toefl/test-takers/ibt/about/content/speaking.html..html",
    verifiedAt:"2026-10-30",status:"planned",
    approximateDurationMinutes:[8,8],examinerCount:0,virtualPartnerRequired:false,
    sections:[
      {id:"listen-repeat",order:1,taskTypes:["listen-and-repeat"],requiresVirtualPartner:false,examinerPrompts:false},
      {id:"interview",order:2,taskTypes:["computer-interview"],requiresVirtualPartner:false,examinerPrompts:true},
    ],
    rubricDimensions:["intelligibility","linguistic-accuracy","fluency","communicative-effectiveness"],
    unofficialPractice:true,
  },
  {
    id:"pte-academic-speaking",version:"pte-academic-2025-enhanced",effectiveFrom:"2025-08-07",
    officialSource:"https://www.pearsonpte.com/pte-academic/test-format/speaking-writing/",
    verifiedAt:"2026-10-30",status:"planned",
    // Official PTE integrates speaking and writing; no standalone speaking total duration.
    examinerCount:0,virtualPartnerRequired:false,
    sections:[
      {id:"speaking-tasks",order:1,taskTypes:[
        "read-aloud","repeat-sentence","describe-image","retell-lecture",
        "short-answer","respond-to-situation","summarize-group-discussion",
      ],requiresVirtualPartner:false,examinerPrompts:false},
    ],
    rubricDimensions:["content","pronunciation","oral-fluency"],
    unofficialPractice:true,
  },
] as const;

const validHttps = (value:string) => {
  try {const u=new URL(value);return u.protocol==="https:" && Boolean(u.hostname);}
  catch {return false;}
};
const isoDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
export function validateOralExamBlueprint(exam:OralExamBlueprint):string[] {
  const errors:string[]=[];
  if(!exam.version || (exam.effectiveFrom !== undefined && !isoDate(exam.effectiveFrom)) || !isoDate(exam.verifiedAt) ||
    !validHttps(exam.officialSource)) errors.push("missing-exam-version-or-source");
  if(exam.status!=="planned" || exam.unofficialPractice!==true) errors.push("misleading-public-readiness");
  if(!exam.sections.length || exam.sections.some((s,i)=>s.order!==i+1||!s.id||!s.taskTypes.length) ||
    new Set(exam.sections.map(s=>s.id)).size!==exam.sections.length) errors.push("invalid-section-sequence");
  if(exam.sections.some(s => (s.minMinutes!==undefined && s.minMinutes<=0) ||
    (s.maxMinutes!==undefined && (s.maxMinutes<=0||s.minMinutes!==undefined&&s.minMinutes>s.maxMinutes))))
    errors.push("invalid-section-timing");
  if(exam.virtualPartnerRequired !== exam.sections.some(s=>s.requiresVirtualPartner))
    errors.push("candidate-partner-mismatch");
  if(exam.virtualPartnerRequired && exam.examinerCount!==2)
    errors.push("cambridge-examiner-count-mismatch");
  if(exam.id==="cambridge-a2-key" &&
    (exam.sections.length!==2 || exam.sections[1].taskTypes[0]!=="partner-discussion"))
    errors.push("ket-speaking-structure-mismatch");
  if(exam.id==="cambridge-b1-preliminary" &&
    (exam.sections.length!==4 || exam.sections[2].taskTypes[0]!=="partner-discussion"))
    errors.push("pet-speaking-structure-mismatch");
  if(exam.id==="ielts-speaking" &&
    (exam.sections.length!==3 || exam.examinerCount!==1 || exam.virtualPartnerRequired ||
      !exam.sections[1].taskTypes.includes("individual-long-turn")))
    errors.push("ielts-speaking-structure-mismatch");
  if(exam.id==="toefl-ibt-speaking-2026" &&
    (exam.effectiveFrom!=="2026-01-21" || exam.examinerCount!==0 || exam.sections.length!==2 ||
      exam.sections[0].taskTypes.join(",")!=="listen-and-repeat" ||
      exam.sections[1].taskTypes.join(",")!=="computer-interview"))
    errors.push("toefl-2026-format-mismatch");
  if(exam.id==="pte-academic-speaking" &&
    (exam.examinerCount!==0 || exam.approximateDurationMinutes!==undefined ||
      !exam.sections[0]?.taskTypes.includes("respond-to-situation") ||
      !exam.sections[0]?.taskTypes.includes("summarize-group-discussion")))
    errors.push("pte-enhanced-format-mismatch");
  if(!exam.rubricDimensions.length || new Set(exam.rubricDimensions).size!==exam.rubricDimensions.length)
    errors.push("missing-rubric-dimensions");
  return errors;
}
export function validateOralExamRegistry():string[] {
  const errors=ORAL_EXAMS.flatMap(x=>validateOralExamBlueprint(x).map(e=>x.id+":"+e));
  if(new Set(ORAL_EXAMS.map(x=>x.id)).size!==ORAL_EXAMS.length)errors.push("duplicate-exam-id");
  return errors;
}

/**
 * Full mocks do not correct, repeat exam prompts on request, or coach. A
 * later runtime handles state transitions and persists audio + scoring facts.
 */
export type OralAction = "ask-next-question" | "answer" | "advance-section" |
  "coach" | "replay-exam-prompt" | "finish" | "partner-answer";
export function allowedOralAction(args:{
  exam:OralExamBlueprint; mode:OralMode; sectionIndex:number; action:OralAction;
  actor:"examiner" | "candidate" | "virtual-partner";
}): boolean {
  const s=args.exam.sections[args.sectionIndex];
  if(!s)return false;
  if(args.mode==="full-mock" && (args.action==="coach"||args.action==="replay-exam-prompt"))return false;
  if(args.action==="coach"||args.action==="replay-exam-prompt")return args.mode==="coached-practice";
  if(args.action==="partner-answer")return args.actor==="virtual-partner"&&s.requiresVirtualPartner;
  if(args.action==="answer")return args.actor==="candidate";
  if(args.action==="ask-next-question")return args.actor==="examiner"&&s.examinerPrompts;
  if(args.action==="advance-section")return args.actor==="examiner";
  if(args.action==="finish")return args.actor==="examiner"&&args.sectionIndex===args.exam.sections.length-1;
  return false;
}
