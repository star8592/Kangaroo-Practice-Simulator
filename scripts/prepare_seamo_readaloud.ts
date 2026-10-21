/** Build a standalone 80-track SEAMO audio worklist without modifying existing G1/G2 manifests. */
import fs from 'node:fs';
import path from 'node:path';
import {loadTrainingExamBundle,trainingQuestions} from '../src/lib/training-question-bank';
import {examSpeechAsset} from '../src/lib/exam-audio';

const ids=['seamo-original-g1-revised-1','seamo-original-g2-revised-1'];
const tasks=new Map<string,{file:string;url:string;language:'zh'|'en';text:string;questionId:string}>();
const covered:{examId:string;grades:string;questionCount:number}[]=[];
for(const id of ids){
 const bundle=loadTrainingExamBundle(id);
 if(bundle.profile.competitionId!=='seamo')throw new Error('Not a SEAMO practice bundle: '+id);
 const questions=trainingQuestions(bundle.questions);
 if(questions.length!==bundle.profile.questionCount)throw new Error('Question count mismatch: '+id);
 covered.push({examId:id,grades:bundle.profile.grades,questionCount:questions.length});
 for(const q of questions){
  if(!q.stemEn)throw new Error('English question missing: '+q.id);
  for(const language of ['zh','en'] as const){
   const stem=language==='zh'?q.stem:q.stemEn;
   const choices=language==='zh'?q.choices:(q.choicesEn||[]);
   if(!stem||!choices)throw new Error('Bilingual speech missing: '+q.id);
   const audio=examSpeechAsset(stem,choices,language);
   if(!audio)throw new Error('Empty speech text: '+q.id);
   if(tasks.has(audio.url))throw new Error('Duplicate SEAMO audio script: '+q.id);
   tasks.set(audio.url,{file:audio.file,url:audio.url,language,text:audio.text,questionId:q.id});
  }
 }
}
if(tasks.size!==80)throw new Error('Expected 80 unique bilingual tracks, got '+tasks.size);
const output=path.join(process.cwd(),'reports','seamo-readaloud-worklist.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({version:1,covered,inactive:[],skipped:0,missingEnglish:0,tasks:[...tasks.values()]},null,2)+'\n');
console.log('SEAMO_AUDIO_WORKLIST=PASS exams=2 questions=40 tracks='+tasks.size+' output='+output);
