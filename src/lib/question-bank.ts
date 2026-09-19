import fs from "node:fs";
import path from "node:path";
import type { ExamBundle, ExamProfile, PublicQuestion, Question } from "./types";
import { buildSmartBundle, mixedProfiles, parseSmartExamId } from "./mixed-exam";
import { normalizeExamProfile } from "./competition-format";

const BANK_PATH = path.join(process.cwd(), "private", "question-bank.json");
const EXAMS_DIR = path.join(process.cwd(), "private", "exams");

function safeExamId(examId:string){if(!/^[a-zA-Z0-9_-]+$/.test(examId))throw new Error("Invalid exam id");return examId;}
function hasBilingualText(q:Question){return Boolean(q.localized?.zh?.stem?.trim()&&q.localized?.en?.stem?.trim());}
export function isStudentReady(q:Question){if(q.language==="zh/en"||q.language==="en"||(q.stem&&q.stemEn))return true;const hasStudentVisual=Boolean(q.studentAssetUrl||(q.studentAssetUrlZh&&q.studentAssetUrlEn));return Boolean(q.examReady&&hasBilingualText(q)&&hasStudentVisual);}
export function loadQuestionBank():Question[]{if(!fs.existsSync(BANK_PATH))throw new Error(`Local question bank not found: ${BANK_PATH}`);return JSON.parse(fs.readFileSync(BANK_PATH,"utf8")) as Question[];}
export function isExamBundleStudentReady(bundle:ExamBundle){return Boolean(bundle.questions.length&&bundle.questions.every(isStudentReady));}
function normalizeBundle(raw:ExamBundle):ExamBundle{return {...raw,profile:normalizeExamProfile(raw.profile)};}

function loadReadyArchiveBundles():ExamBundle[]{
 if(!fs.existsSync(EXAMS_DIR))return[];
 const bundles:ExamBundle[]=[];
 for(const name of fs.readdirSync(EXAMS_DIR).filter(x=>x.endsWith(".json")).sort()){
  if(name.includes("before-bilingual"))continue;
  try{const raw=JSON.parse(fs.readFileSync(path.join(EXAMS_DIR,name),"utf8")) as ExamBundle,bundle=normalizeBundle(raw);if(bundle.profile.country==="Mixed")continue;if(isExamBundleStudentReady(bundle))bundles.push(bundle);}catch{}
 }
 return bundles;
}

export function loadExamBundle(examId:string):ExamBundle{
 const id=safeExamId(examId);
 if(id==="level-a")return loadExamBundle("au-amc-pre-a-sample-1");
 const file=path.join(EXAMS_DIR,`${id}.json`);
 if(fs.existsSync(file))return normalizeBundle(JSON.parse(fs.readFileSync(file,"utf8")) as ExamBundle);
 const smart=parseSmartExamId(id);if(smart)return buildSmartBundle(smart.baseId,smart.seed,loadReadyArchiveBundles());
 throw new Error(`Local exam bundle not found: ${id}`);
}

export function listExamProfiles():ExamProfile[]{
 const archives=loadReadyArchiveBundles(),profiles:ExamProfile[]=[...mixedProfiles(archives)];
 for(const bundle of archives)if(!profiles.some(p=>p.id===bundle.profile.id))profiles.push({...bundle.profile,studentReady:true});
 return profiles;
}

export function publicQuestions(questions:Question[]):PublicQuestion[]{return questions.map(q=>{
 if(!isStudentReady(q))throw new Error(`Question ${q.id} is not student-ready`);
 const localized=hasBilingualText(q);if(!localized&&q.language!=="zh/en"&&q.language!=="en"&&!q.stemEn)throw new Error(`Question ${q.id} is not bilingual-ready`);
 const zh=q.localized?.zh,en=q.localized?.en;
 return{id:q.id,year:q.year,level:q.level,grades:q.grades,language:localized?"zh/en":q.language,questionNo:q.questionNo,points:q.points,answerMode:q.answerMode,concept:localized?"official_original":q.concept,stem:zh?.stem||q.stem,stemEn:en?.stem||q.stemEn,choices:zh?.choices?.length?zh.choices:q.choices,choicesEn:en?.choices?.length?en.choices:q.choicesEn,assetUrl:q.studentAssetUrl||q.assetUrl,assetUrlZh:q.studentAssetUrlZh||q.assetUrlZh,assetUrlEn:q.studentAssetUrlEn||q.assetUrlEn,verified:Boolean(q.verified||q.review?.verified)};
});}
