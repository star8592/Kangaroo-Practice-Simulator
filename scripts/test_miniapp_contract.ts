import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createSessionToken, createStudent, userFromRequest } from '../src/lib/auth'
import { checkMiniappArithmetic, finishMiniappArithmetic, startMiniappArithmetic } from '../src/lib/miniapp-arithmetic'

const root=process.cwd()
const files=[
  path.join(root,'private','users','users.json'),
  path.join(root,'private','users','session-secret.txt'),
  path.join(root,'private','users','miniapp-arithmetic-secret.txt'),
  path.join(root,'private','arithmetic','sessions.jsonl'),
]
const backup=new Map<string,Buffer|null>()
for(const file of files)backup.set(file,fs.existsSync(file)?fs.readFileSync(file):null)
const restore=()=>{for(const [file,data] of backup){fs.mkdirSync(path.dirname(file),{recursive:true});if(data===null){if(fs.existsSync(file))fs.rmSync(file)}else fs.writeFileSync(file,data)}}
try{
  const stamp=Date.now()
  const student=createStudent({username:`miniapp_${stamp}`,candidateNo:`MA${stamp}`,name:'Miniapp Test',grade:1,pin:'1234'})
  const token=createSessionToken(student.id)
  const req={headers:{get:(name:string)=>name.toLowerCase()==='authorization'?`Bearer ${token}`:null},cookies:{get:()=>undefined}}
  assert.equal(userFromRequest(req)?.id,student.id)
  const started=startMiniappArithmetic(student,1,'adaptive')
  assert.ok(started.questions.length>=12)
  assert.equal('answer' in started.questions[0],false)
  const first=started.questions[0]
  const checked=checkMiniappArithmetic(student,started.token,0,'0',{responseMs:1200,firstInputMs:500})
  assert.equal(typeof checked.correct,'boolean')
  assert.ok(checked.correctAnswer.length>0)
  const finished=finishMiniappArithmetic(student,started.token,[{questionId:first.id,answer:checked.correctAnswer,responseMs:1200,firstInputMs:500,edits:0,backspaces:0}])
  assert.equal(finished.ok,true)
  assert.equal(finished.total,1)
  assert.equal(finished.correct,1)
  console.log(`MINIAPP_CONTRACT=PASS bearer=true hidden_answer=true arithmetic_roundtrip=true questions=${started.questions.length}`)
}finally{restore()}
