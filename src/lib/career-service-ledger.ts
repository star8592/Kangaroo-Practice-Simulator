import crypto from "node:crypto";
import type {PoolClient} from "pg";
import {billingPool,BillingConflictError} from "./billing-ledger";
import {getInterviewProfile} from "./career-interview-scenarios";

/** No independent payment ledger: one paid WeChat order grants a fixed number of interview sessions. */
export class CareerCreditsRequired extends Error {}
export class CareerSessionUnavailable extends Error {}
export class CareerRoundUnavailable extends Error {}
const buyerOK=(id:string)=>/^par_[a-zA-Z0-9_]+$/.test(id);
const sessionOK=(id:string)=>/^cais_[a-f0-9]{32}$/.test(id);
const nonceOK=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
const validProfile=(id:string)=>Boolean(getInterviewProfile(id));
async function tx<T>(fn:(client:PoolClient)=>Promise<T>){
 const c=await billingPool().connect();
 try{await c.query("BEGIN");const value=await fn(c);await c.query("COMMIT");return value;}
 catch(error){await c.query("ROLLBACK");throw error;}
 finally{c.release();}
}
export async function getPaidCareerSessionAvailability(buyerId:string,profileId:string){
 if(!buyerOK(buyerId)||!validProfile(profileId))throw new BillingConflictError("Invalid buyer or profile");
 const [credits,live]=await Promise.all([
  billingPool().query<{count:string;per_use:string;monthly:string;monthly_until:Date|null}>(`
    SELECT COALESCE(SUM(g.remaining_sessions),0)::text AS count,
      COALESCE(SUM(g.remaining_sessions) FILTER (WHERE g.billing_mode='per_use'),0)::text AS per_use,
      COALESCE(SUM(g.remaining_sessions) FILTER (WHERE g.billing_mode='monthly'),0)::text AS monthly,
      MAX(g.expires_at) FILTER (WHERE g.billing_mode='monthly') AS monthly_until
    FROM billing_career_session_grants g JOIN billing_orders o ON o.id=g.source_order_id
    WHERE g.payer_parent_id=$1 AND g.profile_id=$2 AND g.revoked_at IS NULL AND o.state='paid'
      AND (g.billing_mode='per_use' OR
           (g.billing_mode='monthly' AND g.valid_from<=now() AND g.expires_at>now()))`,
   [buyerId,profileId]),
  billingPool().query<{count:string}>(`
    SELECT COUNT(*)::text AS count FROM billing_career_sessions s
    JOIN billing_career_session_grants g ON g.source_order_id=s.source_order_id
    JOIN billing_orders o ON o.id=g.source_order_id
    WHERE s.payer_parent_id=$1 AND s.profile_id=$2 AND s.started_at>now()-interval '2 hours'
      AND g.revoked_at IS NULL AND o.state='paid'`,[buyerId,profileId]),
 ]);
 const remaining=Number(credits.rows[0]?.count||0),activeSessions=Number(live.rows[0]?.count||0);
 return {remainingSessions:remaining,
  perUseRemaining:Number(credits.rows[0]?.per_use||0),
  monthlyRemaining:Number(credits.rows[0]?.monthly||0),
  monthlyActiveUntil:credits.rows[0]?.monthly_until?.toISOString()??null,
  activeSessions,available:remaining>0||activeSessions>0};
}
/** Only the server-side verified WeChat buyer can open or retry this reservation. */
export async function startPaidCareerSession(input:{buyerId:string;profileId:string;clientRequestId:string}){
 const {buyerId,profileId,clientRequestId}=input;
 if(!buyerOK(buyerId)||!validProfile(profileId)||!nonceOK(clientRequestId))
  throw new BillingConflictError("Invalid interview session request");
 return tx(async c=>{
  // Serialize all credit grants for the same buyer+profile. Idempotency is checked under the lock.
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["career-sessions:"+buyerId+":"+profileId]);
  const existing=await c.query<{id:string;started_at:Date;valid:boolean}>(`
    SELECT s.id,s.started_at,(s.started_at>now()-interval '2 hours' AND
      g.revoked_at IS NULL AND o.state='paid') AS valid
    FROM billing_career_sessions s JOIN billing_career_session_grants g ON g.source_order_id=s.source_order_id
    JOIN billing_orders o ON o.id=g.source_order_id
    WHERE s.payer_parent_id=$1 AND s.profile_id=$2 AND s.client_request_id=$3
    LIMIT 1`,[buyerId,profileId,clientRequestId]);
  if(existing.rows[0]){
   if(!existing.rows[0].valid)throw new CareerSessionUnavailable("Session expired or payment reversed");
   return {sessionId:existing.rows[0].id,duplicated:true};
  }
  const grant=await c.query<{source_order_id:string}>(`
    SELECT g.source_order_id FROM billing_career_session_grants g
    JOIN billing_orders o ON o.id=g.source_order_id
    WHERE g.payer_parent_id=$1 AND g.profile_id=$2 AND g.revoked_at IS NULL
      AND o.state='paid' AND g.remaining_sessions>0
      AND (g.billing_mode='per_use' OR
           (g.billing_mode='monthly' AND g.valid_from<=now() AND g.expires_at>now()))
    ORDER BY g.expires_at ASC NULLS LAST,g.granted_at,g.source_order_id
    LIMIT 1 FOR UPDATE OF g`,[buyerId,profileId]);
  const source=grant.rows[0]?.source_order_id;
  if(!source)throw new CareerCreditsRequired("No paid interview sessions remain");
  const debit=await c.query("UPDATE billing_career_session_grants SET remaining_sessions=remaining_sessions-1 WHERE source_order_id=$1 AND remaining_sessions>0 RETURNING source_order_id",[source]);
  if(!debit.rows[0])throw new CareerCreditsRequired("Interview credit exhausted");
  const sessionId="cais_"+crypto.randomBytes(16).toString("hex");
  await c.query(`INSERT INTO billing_career_sessions
    (id,payer_parent_id,profile_id,source_order_id,client_request_id)
    VALUES($1,$2,$3,$4,$5)`,[sessionId,buyerId,profileId,source,clientRequestId]);
  return {sessionId,duplicated:false};
 });
}
export async function claimPaidCareerRound(input:{buyerId:string;profileId:string;sessionId:string;questionId:string}){
 const {buyerId,profileId,sessionId,questionId}=input;
 const profile=getInterviewProfile(profileId);
 if(!buyerOK(buyerId)||!sessionOK(sessionId)||!profile||!profile.questions.some(q=>q.id===questionId))
  throw new CareerSessionUnavailable("Invalid interview round");
 return tx(async c=>{
  const session=await c.query<{id:string}>(`
    SELECT s.id FROM billing_career_sessions s
    JOIN billing_career_session_grants g ON g.source_order_id=s.source_order_id
    JOIN billing_orders o ON o.id=g.source_order_id
    WHERE s.id=$1 AND s.payer_parent_id=$2 AND s.profile_id=$3
      AND s.started_at>now()-interval '2 hours' AND o.state='paid' AND g.revoked_at IS NULL
    LIMIT 1 FOR UPDATE OF s`,[sessionId,buyerId,profileId]);
  if(!session.rows[0])throw new CareerSessionUnavailable("Unowned, revoked or expired interview session");
  const claimToken=crypto.randomBytes(16).toString("hex");
  const added=await c.query<{claim_token:string}>(`
    INSERT INTO billing_career_round_calls(session_id,question_id,status,claim_token,attempt_count)
    VALUES($1,$2,'pending',$3,1) ON CONFLICT(session_id,question_id) DO NOTHING
    RETURNING claim_token`,[sessionId,questionId,claimToken]);
  if(added.rows[0])return {claimToken};
  const retried=await c.query<{claim_token:string}>(`
    UPDATE billing_career_round_calls SET status='pending',claim_token=$3,
      attempt_count=attempt_count+1,updated_at=now()
    WHERE session_id=$1 AND question_id=$2 AND attempt_count<2
      AND (status='failed' OR (status='pending' AND updated_at<now()-interval '30 seconds'))
    RETURNING claim_token`,[sessionId,questionId,claimToken]);
  if(retried.rows[0])return {claimToken};
  throw new CareerRoundUnavailable("This question was already used or another request is in progress");
 });
}
/** A failed model request does not permanently block a second attempt at the same question. */
export async function finishPaidCareerRound(input:{sessionId:string;questionId:string;claimToken:string;success:boolean}){
 if(!sessionOK(input.sessionId)||!/^[a-f0-9]{32}$/.test(input.claimToken))
  throw new BillingConflictError("Invalid career round completion");
 const result=await billingPool().query<{session_id:string}>(`
   UPDATE billing_career_round_calls SET status=$4,updated_at=now()
   WHERE session_id=$1 AND question_id=$2 AND claim_token=$3 AND status='pending'
   RETURNING session_id`,[input.sessionId,input.questionId,input.claimToken,input.success?"done":"failed"]);
 return Boolean(result.rows[0]);
}


/** Restore exactly one purchased session when its first AI delivery never succeeded.
 * Idempotent under repeated failure callbacks; a session with any successful or
 * still-pending AI round is never refundable through this internal operation.
 * Not exposed as a user-triggered refund endpoint.
 */
export async function restoreUnservedCareerSession(input:{
 buyerId:string;profileId:string;sessionId:string;
}):Promise<boolean>{
 const {buyerId,profileId,sessionId}=input;
 if(!buyerOK(buyerId)||!validProfile(profileId)||!sessionOK(sessionId))
  throw new BillingConflictError("Invalid unserved interview session");
 return tx(async c=>{
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
   ["career-sessions:"+buyerId+":"+profileId]);
  const session=await c.query<{source_order_id:string}>(`
   SELECT s.source_order_id FROM billing_career_sessions s
   JOIN billing_career_session_grants g ON g.source_order_id=s.source_order_id
   JOIN billing_orders o ON o.id=g.source_order_id
   WHERE s.id=$1 AND s.payer_parent_id=$2 AND s.profile_id=$3
     AND g.revoked_at IS NULL AND o.state='paid'
   LIMIT 1 FOR UPDATE OF s,g`,[sessionId,buyerId,profileId]);
  const source=session.rows[0]?.source_order_id;
  if(!source)return false;
  const rounds=await c.query<{status:string}>(`
   SELECT status FROM billing_career_round_calls WHERE session_id=$1 FOR UPDATE`,[sessionId]);
  // A paid AI turn that succeeded is already a delivered service, and an
  // in-flight attempt might still succeed. Refuse both cases.
  if(!rounds.rows.length||rounds.rows.some(r=>r.status!=="failed"))return false;
  await c.query("DELETE FROM billing_career_round_calls WHERE session_id=$1",[sessionId]);
  await c.query("DELETE FROM billing_career_sessions WHERE id=$1",[sessionId]);
  const restored=await c.query(`
   UPDATE billing_career_session_grants SET remaining_sessions=remaining_sessions+1
   WHERE source_order_id=$1 AND revoked_at IS NULL AND remaining_sessions<purchased_sessions
   RETURNING source_order_id`,[source]);
  if(restored.rowCount!==1)throw new BillingConflictError("Unable to restore unserved interview credit");
  return true;
 });
}
