import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {examAnswerProgress,examQuestionNumber,localizedExamQuestion} from '../apps/miniapp/src/services/exam-view'

const questions=[{id:'q1'},{id:'q2'},{id:'q3'}]
assert.deepEqual(examAnswerProgress(questions,{}),{answered:0,blank:3,total:3})
assert.deepEqual(examAnswerProgress(questions,{q1:'A',q2:' ',q3:'3',unknown:'B'}),
  {answered:2,blank:1,total:3})
assert.deepEqual(examAnswerProgress([],{}),{answered:0,blank:0,total:0})
assert.equal(examQuestionNumber(2,3),3)
assert.equal(examQuestionNumber(-1,3),null)
assert.equal(examQuestionNumber(3,3),null)

const q={
  id:'q1',stem:'小明有几个苹果？',stemEn:'How many apples does Ming have?',
  choices:[{key:'A',label:'三个'},{key:'B',label:'四个'},{key:'C',label:'五个'}],
  choicesEn:[{key:'C',label:'five'},{key:'A',label:'three'}],
  assetUrl:'/common.png',assetUrlZh:'/zh.png',assetUrlEn:'/en.png',
}
const zh=localizedExamQuestion(q,'zh'),en=localizedExamQuestion(q,'en')
assert.equal(zh.stem,q.stem)
assert.equal(en.stem,q.stemEn)
assert.deepEqual(zh.choices.map(x=>x.key),['A','B','C'])
assert.deepEqual(en.choices.map(x=>x.key),['A','B','C'],
  'choice identity must not change with language')
assert.deepEqual(en.choices.map(x=>x.label),['three','四个','five'],
  'partial translation must match by key and safely fall back')
assert.equal(zh.assetUrl,'/zh.png')
assert.equal(en.assetUrl,'/en.png')
assert.equal(localizedExamQuestion({id:'q2',stem:'Only Chinese',choices:[]},'en').stem,'Only Chinese')

const root=path.join(import.meta.dirname,'..')
const exam=fs.readFileSync(path.join(root,'apps/miniapp/src/pages/exam/index.tsx'),'utf8')
const style=fs.readFileSync(path.join(root,'apps/miniapp/src/app.css'),'utf8')
for(const token of [
  "localizedExamQuestion(q,language)",
  "examAnswerProgress(bundle.questions,answers)",
  "setLanguage('zh')", "setLanguage('en')",
  "id='exam-answer-sheet'",
  'bundle.questions.map((item:any,n:number)',
  'onClick={()=>move(n)}',
  'onClick={submit}',
  'progress.answered',
  'progress.blank',
  'const confirmed=await Taro.showModal',
  "if(submitting.current)return",
  'if(busy||submitting.current)return',
  "persist({answers:next,events:nextEvents})",
  'persist({idx:next,events:nextEvents})',
]){
  assert.ok(exam.includes(token),'missing exam interaction or persistence: '+token)
}
assert.ok(exam.indexOf('if(result)return')<exam.indexOf('if(!bundle)return'))
assert.ok(exam.includes('makeExamLoginPath(examId)'), 'never bypass login in the exam page')
for(const token of ['.exam-question-grid','.exam-question-number.current','.exam-question-number.answered','.exam-submit']){
  assert.ok(style.includes(token),'missing question navigator stylesheet: '+token)
}
console.log('MINIAPP_EXAM_UX=PASS bilingual=STEM_CHOICES_IMAGE key_identity=STABLE answer_sheet=PASS submit_guard=PASS draft=UNCHANGED')
