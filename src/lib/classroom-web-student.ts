import type {NextRequest} from "next/server";
import {verifyClassInvitation} from "./classroom-invitations";
import {
  type Actor,ClassroomFailure,enrolled,ensureAccount,id,invite,jsonBody,tx,txt,classForAssignment
} from "@/lib/classroom-web-core";

function grade(v:unknown):string{
  const s=txt(v,16,1);
  if(!/^(G[1-9]|G1[0-2]|[一二三四五六七八九]年级|初[一二三]|高[一二三]|一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|其他|未填写)$/u.test(s))
    throw new ClassroomFailure(400,"请选择正确的年级");
  return s;
}
export async function studentHandler(req:NextRequest,p:string[],a:Actor):Promise<unknown|undefined>{
  // Student self-directory works across teachers without enumerating any
  // other student's enrollment, protected by the explicit student RLS policy.
  if(p[0]==="student"&&p[1]==="classes"&&p.length===2&&req.method==="GET"){
    return tx({account:a.accountId},async db=>{
      const result=await db.query(["SELECT c.tenant_id,c.id AS class_id,c.title AS class_name,t.display_name AS teacher_name",
        "FROM accent.class_enrollments e JOIN accent.classes c",
        "ON c.tenant_id=e.tenant_id AND c.id=e.class_id",
        "JOIN accent.memberships m ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
        "JOIN accent.memberships t ON t.tenant_id=c.tenant_id AND t.account_id=c.lead_teacher_id",
        "WHERE e.account_id=$1 AND e.role='student' AND m.role='student' AND m.state='active'",
        "AND t.role='teacher' AND t.state='active'",
        "ORDER BY e.enrolled_at DESC LIMIT 100"].join(" "),[a.accountId]);
      return {classes:result.rows};
    });
  }
  // Standalone teacher class invitation. The token identifies ONLY the class;
  // actual membership requires the student's existing WeChat session,
  // a non-placeholder display name, and teacher approval.
  if(p[0]==="class-join"&&p.length===4){
    const tenant=id(p[1]),cl=id(p[2]),token=p[3];
    if(req.method!=="GET"&&req.method!=="POST")return undefined;
    if(req.method==="POST"&&(!a.name||["微信用户","微信家长"].includes(a.name)))
      throw new ClassroomFailure(409,"请先完善姓名或昵称后申请入班");
    const body=req.method==="POST"?await jsonBody(req):null;
    const studentName=body?txt(body.student_name,30,2):"";
    const gradeLabel=body?grade(body.grade_label):"";
    return tx({tenant,account:a.accountId},async db=>{
      const invite=await db.query("SELECT rotation,enabled FROM accent.class_invitations WHERE tenant_id=$1 AND class_id=$2",[tenant,cl]);
      const entry=invite.rows[0];
      if(!entry?.enabled||!verifyClassInvitation(tenant,cl,entry.rotation,token))
        throw new ClassroomFailure(404,"班级邀请码已停用或失效，请联系老师获取新链接");
      const found=await db.query(["SELECT c.title AS class_name,c.lead_teacher_id,",
        "m.display_name AS teacher_name FROM accent.classes c",
        "JOIN accent.memberships m ON m.tenant_id=c.tenant_id AND m.account_id=c.lead_teacher_id",
        "WHERE c.tenant_id=$1 AND c.id=$2 AND m.role='teacher' AND m.state='active'"].join(" "),[tenant,cl]);
      if(!found.rows.length)throw new ClassroomFailure(404,"班级不存在");
      const classInfo=found.rows[0];
      const publicInfo={class_name:classInfo.class_name,teacher_name:classInfo.teacher_name};
      if(classInfo.lead_teacher_id===a.accountId)
        throw new ClassroomFailure(409,"老师不能使用自己的微信加入自己的学生班级");
      const enrolled=await db.query(["SELECT 1 FROM accent.class_enrollments e",
        "JOIN accent.memberships m ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
        "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.account_id=$3",
        "AND e.role='student' AND m.role='student' AND m.state='active'"].join(" "),
        [tenant,cl,a.accountId]);
      if(enrolled.rows.length)return {...publicInfo,status:"approved",joined:true};
      const old=await db.query(["SELECT status FROM accent.class_join_requests",
        "WHERE tenant_id=$1 AND requested_class_id=$2 AND student_id=$3"].join(" "),
        [tenant,cl,a.accountId]);
      if(!body)return {...publicInfo,status:old.rows[0]?.status||"new",joined:false};
      await ensureAccount(db,a);
      await db.query(["INSERT INTO accent.memberships(tenant_id,account_id,role,state,display_name)",
        "VALUES($1,$2,'student','invited',$3) ON CONFLICT(tenant_id,account_id) DO NOTHING"].join(" "),
        [tenant,a.accountId,studentName]);
      const m=await db.query("SELECT role,state FROM accent.memberships WHERE tenant_id=$1 AND account_id=$2 FOR UPDATE",
        [tenant,a.accountId]);
      if(m.rows[0]?.state==="paused"||m.rows[0]?.role!=="student")
        throw new ClassroomFailure(403,"该账号不能作为本班学生入班");
      await db.query(["INSERT INTO accent.class_join_requests",
        "(tenant_id,requested_class_id,assignment_id,student_id,student_name,grade_label)",
        "VALUES($1,$2,NULL,$3,$4,$5)",
        "ON CONFLICT(tenant_id,requested_class_id,student_id) DO UPDATE SET",
        "status='pending',student_name=EXCLUDED.student_name,",
        "grade_label=EXCLUDED.grade_label,assigned_class_id=NULL,",
        "reviewed_by=NULL,reviewed_at=NULL,updated_at=now()"].join(" "),
        [tenant,cl,a.accountId,studentName,gradeLabel]);
      return {...publicInfo,status:"pending",joined:false};
    });
  }
  if(p[0]!=="tenants"||p.length<4)return undefined;
  const tenant=id(p[1]),method=req.method;
  if(p[2]==="a"){
    const raw=p[3];
    if(p[4]==="join"&&p.length===5&&method==="POST"){
      const body=await jsonBody(req);
      const studentName=txt(body.student_name,30),label=grade(body.grade_label);
      return tx({tenant,account:a.accountId},async db=>{
        const i=await invite(db,tenant,raw);
        await ensureAccount(db,a);
        await db.query(["INSERT INTO accent.memberships(tenant_id,account_id,role,state,display_name)",
          "VALUES($1,$2,'student','invited',$3) ON CONFLICT(tenant_id,account_id) DO NOTHING"].join(" "),
          [tenant,a.accountId,studentName]);
        const state=await db.query("SELECT state FROM accent.memberships WHERE tenant_id=$1 AND account_id=$2",
          [tenant,a.accountId]);
        if(state.rows[0]?.state==="paused")throw new ClassroomFailure(403,"该课堂账号已暂停");
        const existing=await db.query(["SELECT 1 FROM accent.class_enrollments WHERE tenant_id=$1 AND class_id=$2",
          "AND account_id=$3 AND role='student'"].join(" "),[tenant,i.classId,a.accountId]);
        if(existing.rows.length&&state.rows[0]?.state==="active")
          return {joined:true,status:"approved",assignment_id:i.assignment,title:i.title};
        await db.query(["INSERT INTO accent.class_join_requests",
          "(tenant_id,requested_class_id,assignment_id,student_id,student_name,grade_label)",
          "VALUES($1,$2,$3,$4,$5,$6)",
          "ON CONFLICT(tenant_id,requested_class_id,student_id)",
          "DO UPDATE SET status='pending',student_name=EXCLUDED.student_name,",
          "grade_label=EXCLUDED.grade_label,assignment_id=EXCLUDED.assignment_id,",
          "assigned_class_id=NULL,reviewed_by=NULL,reviewed_at=NULL,updated_at=now()"].join(" "),
          [tenant,i.classId,i.assignment,a.accountId,studentName,label]);
        return {joined:true,status:"pending",assignment_id:i.assignment,title:i.title};
      });
    }
    if(p[4]==="join-status"&&p.length===5&&method==="GET")
      return tx({tenant,account:a.accountId},async db=>{
        const i=await invite(db,tenant,raw);
        const m=await db.query(["SELECT 1 FROM accent.class_enrollments e JOIN accent.memberships m",
          "ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
          "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.account_id=$3",
          "AND e.role='student' AND m.state='active'"].join(" "),
          [tenant,i.classId,a.accountId]);
        if(m.rows.length)return {status:"approved",joined:true};
        const s=await db.query(["SELECT status FROM accent.class_join_requests",
          "WHERE tenant_id=$1 AND requested_class_id=$2 AND student_id=$3"].join(" "),
          [tenant,i.classId,a.accountId]);
        return {status:s.rows[0]?.status||"new",joined:false};
      });
    if(p[4]==="claim"&&p.length===5&&method==="POST")
      return tx({tenant,account:a.accountId},async db=>{
        const i=await invite(db,tenant,raw);await enrolled(db,a,tenant,i.classId);
        const q=await db.query(["INSERT INTO accent.assignment_receipts",
          "(tenant_id,assignment_id,student_id,status,claimed_at)",
          "VALUES($1,$2,$3,'in_progress',now())",
          "ON CONFLICT(tenant_id,assignment_id,student_id)",
          "DO UPDATE SET claimed_at=COALESCE(accent.assignment_receipts.claimed_at,now()),updated_at=now()",
          "RETURNING claimed_at"].join(" "),[tenant,i.assignment,a.accountId]);
        return {claimed:true,assignment_id:i.assignment,claimed_at:q.rows[0].claimed_at};
      });
    if(p.length===4&&method==="GET")
      return tx({tenant,account:a.accountId},async db=>{
        const i=await invite(db,tenant,raw);await enrolled(db,a,tenant,i.classId);
        const r=await db.query(["SELECT s.id AS sentence_id,s.english_text AS sentence,x.ordinal",
          "FROM accent.class_assignment_items x JOIN accent.sentence_items s",
          "ON s.tenant_id=x.tenant_id AND s.id=x.sentence_id",
          "WHERE x.tenant_id=$1 AND x.assignment_id=$2 ORDER BY x.ordinal"].join(" "),
          [tenant,i.assignment]);
        return {assignment_id:i.assignment,title:i.title,student_id:a.accountId,items:r.rows};
      });
    if(p[4]==="activity"&&p.length===5&&method==="GET")
      return tx({tenant,account:a.accountId},async db=>{
        const i=await invite(db,tenant,raw);await enrolled(db,a,tenant,i.classId);
        const r=await db.query(["SELECT (SELECT count(*)::int FROM accent.class_enrollments",
          "WHERE tenant_id=$1 AND class_id=$2 AND role='student') AS total,",
          "(SELECT count(*)::int FROM accent.assignment_receipts",
          "WHERE tenant_id=$1 AND assignment_id=$3 AND status IN ('submitted','completed')) AS submitted"].join(" "),
          [tenant,i.classId,i.assignment]);
        return r.rows[0];
      });
    if(p[4]==="wall"&&p.length===5&&method==="GET")
      return tx({tenant,account:a.accountId},async db=>{
        const i=await invite(db,tenant,raw);await enrolled(db,a,tenant,i.classId);
        const meta=await db.query("SELECT title FROM accent.classes WHERE tenant_id=$1 AND id=$2",
          [tenant,i.classId]);
        const roster=await db.query(["SELECT name,display_alias FROM accent.class_expected_roster",
          "WHERE tenant_id=$1 AND class_id=$2 ORDER BY added_at,name LIMIT 100"].join(" "),
          [tenant,i.classId]);
        const rows=await db.query(["SELECT e.account_id,m.display_name,r.status,r.claimed_at,r.submitted_at,",
          "(SELECT count(*)::int FROM accent.assignment_attempt_links l",
          "WHERE l.tenant_id=e.tenant_id AND l.assignment_id=$3 AND l.student_id=e.account_id) AS attempts,",
          "(SELECT max(p.reference_score)::float8 FROM accent.assignment_attempt_links l",
          "JOIN accent.pronunciation_assessments p",
          "ON p.tenant_id=l.tenant_id AND p.attempt_id=l.attempt_id",
          "WHERE l.tenant_id=e.tenant_id AND l.assignment_id=$3 AND l.student_id=e.account_id) AS best_score",
          "FROM accent.class_enrollments e JOIN accent.memberships m",
          "ON m.tenant_id=e.tenant_id AND m.account_id=e.account_id",
          "LEFT JOIN accent.assignment_receipts r",
          "ON r.tenant_id=e.tenant_id AND r.student_id=e.account_id AND r.assignment_id=$3",
          "WHERE e.tenant_id=$1 AND e.class_id=$2 AND e.role='student' AND m.state='active'"].join(" "),
          [tenant,i.classId,i.assignment]);
        const animals=["小海豚","小狐狸","小考拉","小熊猫","小企鹅","小海豹","小松鼠","小兔子"];
        const ordered=roster.rows.length?roster.rows.map((r,index)=>{
          const found=rows.rows.find(x=>String(x.display_name).trim().toLowerCase()===
            String(r.name).trim().toLowerCase());
          return {slot:index+1,alias:r.display_alias||animals[index%animals.length],
            avatar:animals[index%animals.length],mine:found?.account_id===a.accountId,
            submitted:Boolean(found?.submitted_at),claimed:Boolean(found?.claimed_at),
            claim_order:null,finish_order:null};
        }):rows.rows.map((r,index)=>({slot:index+1,alias:animals[index%animals.length],
          avatar:animals[index%animals.length],mine:r.account_id===a.accountId,
          submitted:Boolean(r.submitted_at),claimed:Boolean(r.claimed_at),
          claim_order:null,finish_order:null}));
        const me=rows.rows.find(r=>r.account_id===a.accountId);
        return {assignment_id:i.assignment,title:i.title,class_name:meta.rows[0]?.title||"英语班",
          expected_total:roster.rows.length,enrolled_total:rows.rows.length,
          claimed_total:rows.rows.filter(r=>r.claimed_at).length,
          submitted:rows.rows.filter(r=>r.submitted_at).length,
          scoreboard_public:false,privacy:"shared_class_roster_names",cards:ordered,
          my:{enrolled:true,name:me?.display_name||null,claimed:Boolean(me?.claimed_at),
            submitted:Boolean(me?.submitted_at),attempts:me?.attempts||0,
            best_score:me?.best_score??null,reward:me?.submitted_at?"已完成":"继续加油"}};
      });
    return undefined;
  }
  if(p[2]==="assignments"&&p.length===5&&p[4]==="my-attempts"&&method==="GET"){
    const assignment=id(p[3]);
    return tx({tenant,account:a.accountId},async db=>{
      const cl=await classForAssignment(db,tenant,assignment);await enrolled(db,a,tenant,cl);
      const r=await db.query(["SELECT l.attempt_id,l.sentence_id,p.reference_score::float8 AS score,",
        "l.linked_at AS time,p.model_version",
        "FROM accent.assignment_attempt_links l JOIN accent.pronunciation_assessments p",
        "ON p.tenant_id=l.tenant_id AND p.attempt_id=l.attempt_id",
        "WHERE l.tenant_id=$1 AND l.assignment_id=$2 AND l.student_id=$3",
        "ORDER BY l.linked_at DESC LIMIT 250"].join(" "),[tenant,assignment,a.accountId]);
      const receipt=await db.query(["SELECT status FROM accent.assignment_receipts",
        "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3"].join(" "),
        [tenant,assignment,a.accountId]);
      const state=receipt.rows[0]?.status||"in_progress";
      // Only the authenticated student can read feedback addressed to this
      // exact assignment and account; do not enumerate classmates or teachers.
      const feedback=await db.query(["SELECT attempt_id,word_position,comment,created_at AS at",
        "FROM accent.assignment_teacher_feedback",
        "WHERE tenant_id=$1 AND assignment_id=$2 AND student_id=$3",
        "ORDER BY created_at DESC LIMIT 100"].join(" "),
        [tenant,assignment,a.accountId]);
      return {student_id:a.accountId,assignment_id:assignment,attempt_count:r.rows.length,
        receipt_status:state,submitted:["submitted","completed"].includes(state),
        attempts:r.rows,teacher_feedback:feedback.rows};
    });
  }
  return undefined;
}
