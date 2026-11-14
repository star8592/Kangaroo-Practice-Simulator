import crypto from "node:crypto";
import path from "node:path";
import {mkdir,readFile,writeFile,unlink} from "node:fs/promises";
import {NextRequest} from "next/server";
import {
  type Actor,ClassroomFailure,teacher,enrolled,invite,
  tx,id,txt,jsonBody,classForAssignment
} from "@/lib/classroom-web-core";

const recorderRoot=()=>process.env.SOCTHINK_CLASSROOM_RECORDINGS_DIR?.trim()||
  "/var/lib/socthink/accent-classroom/recordings";
function int(v:unknown,lo:number,hi:number):number|null{
  if(v===null||v===undefined)return null;
  if(typeof v!=="number"||!Number.isInteger(v)||v<lo||v>hi)
    throw new ClassroomFailure(400,"参数无效");
  return v;
}
async function score(expected:string,bytes:Uint8Array,mime:string):Promise<Record<string,unknown>>{
  const form=new FormData();
  form.append("expected_text",expected);form.append("lang","en");
  form.append("file",new Blob([new Uint8Array(bytes)],{type:mime}),mime==="audio/mp4"?"voice.mp4":"voice.webm");
  let response:Response;
  try{
    response=await fetch("http://127.0.0.1:18099/pronunciation",{
      method:"POST",body:form,signal:AbortSignal.timeout(35000),cache:"no-store"
    });
  }catch(e){
    const timed=e instanceof Error&&(e.name==="TimeoutError"||e.name==="AbortError");
    throw new ClassroomFailure(timed?504:502,timed?"评分超时，请重试同一录音":"发音评分暂不可用");
  }
  if(!response.ok)throw new ClassroomFailure(502,"评分引擎暂时拒绝录音");
  let result:Record<string,unknown>;
  try{result=await response.json() as Record<string,unknown>}
  catch{throw new ClassroomFailure(502,"评分数据格式不正确")}
  const value=result.score;
  if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>100)
    throw new ClassroomFailure(502,"评分引擎未返回有效分数");
  return result;
}
async function saveRecording(tenant:string,attempt:string,mime:string,data:Uint8Array):Promise<string>{
  const dir=path.join(recorderRoot(),id(tenant));
  await mkdir(dir,{recursive:true,mode:0o700});
  const rel=id(tenant)+"/"+id(attempt)+(mime==="audio/mp4"?".mp4":".webm");
  await writeFile(path.join(recorderRoot(),rel),data,{flag:"wx",mode:0o600});
  return rel;
}
export async function assessmentHandler(req:NextRequest,p:string[],a:Actor):
  Promise<unknown|Response|undefined>{
  if(p[0]!=="tenants"||p.length<4)return undefined;
  const tenant=id(p[1]);
  if(p[2]==="a"&&p[4]==="items"&&p[6]==="attempts"&&p.length===7&&req.method==="POST"){
    const share=p[3],sentence=id(p[5]),mime=(req.headers.get("content-type")||"").split(";")[0].trim();
    const requestId=id(req.headers.get("x-request-id")||"");
    if(mime!=="audio/webm"&&mime!=="audio/mp4")
      throw new ClassroomFailure(415,"只支持 WebM/MP4 录音");
    const reported=Number(req.headers.get("content-length")||"0");
    if(reported>2*1024*1024)throw new ClassroomFailure(413,"录音超过 2MB");
    const bytes=new Uint8Array(await req.arrayBuffer());
    if(bytes.byteLength<1024||bytes.byteLength>2*1024*1024)
      throw new ClassroomFailure(413,"录音大小无效");
    return tx({tenant,account:a.accountId},async db=>{
      const invitation=await invite(db,tenant,share);
      await enrolled(db,a,tenant,invitation.classId);
      const sentenceRow=await db.query(["SELECT s.english_text FROM accent.class_assignment_items i",
        "JOIN accent.sentence_items s ON s.tenant_id=i.tenant_id AND s.id=i.sentence_id",
        "WHERE i.tenant_id=$1 AND i.assignment_id=$2 AND i.sentence_id=$3"].join(" "),
        [tenant,invitation.assignment,sentence]);
      if(!sentenceRow.rows.length)throw new ClassroomFailure(403,"此句不属于当前作业");
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        ["classroom:"+tenant+":"+invitation.assignment+":"+a.accountId+":"+requestId]);
      const existing=await db.query(["SELECT l.attempt_id,p.result_json FROM accent.assignment_attempt_links l",
        "JOIN accent.pronunciation_assessments p",
        "ON p.tenant_id=l.tenant_id AND p.attempt_id=l.attempt_id",
        "WHERE l.tenant_id=$1 AND l.assignment_id=$2 AND l.student_id=$3 AND l.client_request_id=$4"].join(" "),
        [tenant,invitation.assignment,a.accountId,requestId]);
      if(existing.rows.length){
        const x=existing.rows[0],r=await db.query(["SELECT status FROM accent.assignment_receipts",
          "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3"].join(" "),
          [tenant,invitation.assignment,a.accountId]);
        return {duplicate:true,attempt_id:x.attempt_id,score:x.result_json?.score,
          assessment:x.result_json,submitted:["submitted","completed"].includes(r.rows[0]?.status),student_id:a.accountId};
      }
      const count=await db.query(["SELECT count(*)::int AS n FROM accent.assignment_attempt_links",
        "WHERE tenant_id=$1 AND student_id=$2 AND linked_at>now()-interval '1 hour'"].join(" "),
        [tenant,a.accountId]);
      if(count.rows[0].n>=40)throw new ClassroomFailure(429,"练习次数过多，请稍后再试");
      const result=await score(sentenceRow.rows[0].english_text,bytes,mime);
      const attempt=crypto.randomUUID(),session=crypto.randomUUID();
      const saved=await saveRecording(tenant,attempt,mime,bytes);
      try{
        await db.query(["INSERT INTO accent.practice_sessions(tenant_id,id,student_id,class_id)",
          "VALUES($1,$2,$3,$4)"].join(" "),[tenant,session,a.accountId,invitation.classId]);
        await db.query(["INSERT INTO accent.pronunciation_attempts",
          "(tenant_id,id,session_id,sentence_id,student_id,recording_asset_key,status,duration_ms,audio_retention_until)",
          "VALUES($1,$2,$3,$4,$5,$6,'scored',0,now()+interval '30 days')"].join(" "),
          [tenant,attempt,session,sentence,a.accountId,saved]);
        await db.query(["INSERT INTO accent.pronunciation_assessments",
          "(tenant_id,attempt_id,model_id,model_version,reference_score,result_json)",
          "VALUES($1,$2,$3,$4,$5,$6::jsonb)"].join(" "),
          [tenant,attempt,String(result.engine||"OpenPronounce").slice(0,120),
            String(result.engine_version||"unspecified").slice(0,120),result.score,JSON.stringify(result)]);
        await db.query(["INSERT INTO accent.assignment_attempt_links",
          "(tenant_id,assignment_id,sentence_id,student_id,attempt_id,client_request_id)",
          "VALUES($1,$2,$3,$4,$5,$6)"].join(" "),
          [tenant,invitation.assignment,sentence,a.accountId,attempt,requestId]);
        await db.query(["INSERT INTO accent.assignment_receipts",
          "(tenant_id,assignment_id,student_id,status,claimed_at)",
          "VALUES($1,$2,$3,'in_progress',now())",
          "ON CONFLICT(tenant_id,assignment_id,student_id) DO NOTHING"].join(" "),
          [tenant,invitation.assignment,a.accountId]);
        const progress=await db.query(["SELECT",
          "(SELECT count(*)::int FROM accent.class_assignment_items",
          "WHERE tenant_id=$1 AND assignment_id=$2) AS required,",
          "(SELECT count(DISTINCT sentence_id)::int FROM accent.assignment_attempt_links",
          "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3) AS done"].join(" "),
          [tenant,invitation.assignment,a.accountId]);
        const complete=progress.rows[0].required>0&&progress.rows[0].done>=progress.rows[0].required;
        if(complete){
          await db.query(["UPDATE accent.assignment_receipts",
            "SET status='submitted',submitted_at=COALESCE(submitted_at,now()),updated_at=now()",
            "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3",
            "AND status='in_progress'"].join(" "),
            [tenant,invitation.assignment,a.accountId]);
        }
        return {duplicate:false,attempt_id:attempt,score:result.score,
          assessment:result,submitted:complete,student_id:a.accountId};
      }catch(e){
        await unlink(path.join(recorderRoot(),saved)).catch(()=>undefined);
        throw e;
      }
    });
  }
  if(p[2]==="assignments"&&p.length>=5){
    const assignment=id(p[3]);
    if(p[4]==="report"&&p.length===5&&req.method==="GET")
      return tx({tenant,account:a.accountId},async db=>{
        const cl=await classForAssignment(db,tenant,assignment);await teacher(db,a,tenant,cl);
        const students=await db.query(["SELECT e.account_id AS student_id,m.display_name AS name,",
          "(SELECT count(*)::int FROM accent.assignment_attempt_links l",
          "WHERE l.tenant_id=e.tenant_id AND l.student_id=e.account_id AND l.assignment_id=$3) AS attempts,",
          "(SELECT max(p.reference_score)::float8 FROM accent.assignment_attempt_links l",
          "JOIN accent.pronunciation_assessments p ON p.tenant_id=l.tenant_id AND p.attempt_id=l.attempt_id",
          "WHERE l.tenant_id=e.tenant_id AND l.student_id=e.account_id AND l.assignment_id=$3) AS best_score,",
          "(r.claimed_at IS NOT NULL) AS claimed,(r.status IN ('submitted','completed')) AS submitted",
          "FROM accent.class_enrollments e JOIN accent.memberships m",
          "ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
          "LEFT JOIN accent.assignment_receipts r",
          "ON r.tenant_id=e.tenant_id AND r.student_id=e.account_id AND r.assignment_id=$3",
          "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.role='student' AND m.state='active'",
          "ORDER BY m.display_name LIMIT 200"].join(" "),[tenant,cl,assignment]);
        const history=await db.query(["SELECT l.attempt_id,l.student_id,p.reference_score::float8 AS score,",
          "l.linked_at AS at,p.model_version FROM accent.assignment_attempt_links l",
          "JOIN accent.pronunciation_assessments p ON p.tenant_id=l.tenant_id AND p.attempt_id=l.attempt_id",
          "WHERE l.tenant_id=$1 AND l.assignment_id=$2 ORDER BY l.linked_at DESC LIMIT 500"].join(" "),
          [tenant,assignment]);
        const feedback=await db.query(["SELECT student_id,attempt_id,word_position,comment,created_at AS at",
          "FROM accent.assignment_teacher_feedback WHERE tenant_id=$1 AND assignment_id=$2",
          "ORDER BY created_at DESC LIMIT 250"].join(" "),[tenant,assignment]);
        const words=await db.query(["SELECT w.expected_word AS word,count(DISTINCT l.student_id)::int AS students_affected,",
          "min(w.evidence_kind) AS evidence FROM accent.pronunciation_word_evidence w",
          "JOIN accent.assignment_attempt_links l ON l.tenant_id=w.tenant_id AND l.attempt_id=w.attempt_id",
          "WHERE w.tenant_id=$1 AND l.assignment_id=$2",
          "GROUP BY w.expected_word ORDER BY students_affected DESC LIMIT 20"].join(" "),
          [tenant,assignment]);
        return {assignment_id:assignment,total:students.rows.length,
          submitted:students.rows.filter(x=>x.submitted).length,students:students.rows,
          attempt_history:history.rows,teacher_feedback:feedback.rows,suspected_words:words.rows};
      });
    if(p[4]==="feedback"&&p.length===5&&req.method==="POST"){
      const body=await jsonBody(req),student=id(body.student_id as string),
        attempt=body.attempt_id==null?null:id(body.attempt_id as string),
        position=int(body.word_position,0,180),comment=txt(body.comment,500);
      return tx({tenant,account:a.accountId},async db=>{
        const cl=await classForAssignment(db,tenant,assignment);await teacher(db,a,tenant,cl);
        const ok=await db.query(["SELECT 1 FROM accent.assignment_receipts r",
          "JOIN accent.class_enrollments e ON e.tenant_id=r.tenant_id",
          "AND e.account_id=r.student_id AND e.class_id=$3",
          "WHERE r.tenant_id=$1 AND r.assignment_id=$2 AND r.student_id=$4"].join(" "),
          [tenant,assignment,cl,student]);
        if(!ok.rows.length)throw new ClassroomFailure(403,"该学生不属于本作业");
        if(attempt){
          const linked=await db.query(["SELECT 1 FROM accent.assignment_attempt_links",
            "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3 AND attempt_id=$4"].join(" "),
            [tenant,assignment,student,attempt]);
          if(!linked.rows.length)throw new ClassroomFailure(403,"录音不属于该学生");
        }
        const feedbackId=crypto.randomUUID();
        await db.query(["INSERT INTO accent.assignment_teacher_feedback",
          "(tenant_id,id,assignment_id,student_id,teacher_id,attempt_id,word_position,comment)",
          "VALUES($1,$2,$3,$4,$5,$6,$7,$8)"].join(" "),
          [tenant,feedbackId,assignment,student,a.accountId,attempt,position,comment]);
        return {saved:true,feedback_id:feedbackId};
      });
    }
  }
  if(p[2]==="recordings"&&p.length===4&&req.method==="GET"){
    const attempt=id(p[3]);
    return tx({tenant,account:a.accountId},async db=>{
      const r=await db.query(["SELECT t.recording_asset_key,t.student_id,a.class_id",
        "FROM accent.pronunciation_attempts t",
        "JOIN accent.assignment_attempt_links l ON l.tenant_id=t.tenant_id AND l.attempt_id=t.id",
        "JOIN accent.class_assignments a ON a.tenant_id=l.tenant_id AND a.id=l.assignment_id",
        "WHERE t.tenant_id=$1 AND t.id=$2 AND t.status<>'deleted'",
        "AND t.recording_deleted_at IS NULL AND t.audio_retention_until>now() LIMIT 1"].join(" "),
        [tenant,attempt]);
      if(!r.rows.length)throw new ClassroomFailure(404,"录音已过期或不存在");
      const x=r.rows[0];
      if(x.student_id!==a.accountId)await teacher(db,a,tenant,x.class_id);
      const ext=String(x.recording_asset_key||"");
      if(ext!==tenant+"/"+attempt+".mp4"&&ext!==tenant+"/"+attempt+".webm")
        throw new ClassroomFailure(404,"录音路径无效");
      const data=await readFile(path.join(recorderRoot(),ext)).catch(()=>null);
      if(!data)throw new ClassroomFailure(404,"录音文件不可用");
      return new Response(new Uint8Array(data),{status:200,headers:{
        "Content-Type":ext.endsWith(".mp4")?"audio/mp4":"audio/webm",
        "Cache-Control":"private, no-store",
        "X-Content-Type-Options":"nosniff"
      }});
    });
  }
  return undefined;
}
